// ============================================================================
// AGRILENS BACKEND SERVICES — API & BUSINESS LOGIC LAYER
// Enforces RLS policies and ecosystem workflows
// ============================================================================

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

// ─── PROFILE SERVICES ──────────────────────────────────────────────────────

/**
 * Create or update a farmer profile with verification guardrails
 * Only Farmers with valid PAN/Aadhar can be listed
 */
export const createFarmerProfile = async (profileData) => {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Unauthorized");

  // Validate required farmer fields
  if (!profileData.pan_number || !profileData.farm_size_acres) {
    throw new Error("Farmers must provide PAN and farm size");
  }

  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        email: user.email,
        role: "farmer",
        full_name: profileData.full_name,
        pan_number: profileData.pan_number,
        aadhar_number: profileData.aadhar_number,
        farm_size_acres: profileData.farm_size_acres,
        irrigation_type: profileData.irrigation_type,
        district: profileData.district,
        village: profileData.village,
        latitude: profileData.latitude,
        longitude: profileData.longitude,
        is_verified: false,
        verification_status: "pending",
      },
      { onConflict: "id" }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Admin-only: Verify a farmer profile
 * Creates digital ID once verification is approved
 */
export const verifyFarmerProfile = async (farmerId, isApproved, documentUrl) => {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Unauthorized");

  // Check if user is admin
  const { data: adminCheck } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (adminCheck?.role !== "admin") {
    throw new Error("Only admins can verify farmer profiles");
  }

  const verification_status = isApproved ? "verified" : "rejected";

  const { data, error } = await supabase
    .from("profiles")
    .update({
      is_verified: isApproved,
      verification_status,
      verified_at: new Date().toISOString(),
      verification_document_url: documentUrl,
    })
    .eq("id", farmerId)
    .select()
    .single();

  if (error) throw error;

  // If approved, create digital ID
  if (isApproved) {
    await createFarmerDigitalId(farmerId);
  }

  return data;
};

// ─── FARMER DIGITAL ID SERVICES ────────────────────────────────────────────

/**
 * Create farmer digital ID with QR code
 * Only called after farmer is verified by admin
 */
export const createFarmerDigitalId = async (farmerId) => {
  const { data: farmer } = await supabase
    .from("profiles")
    .select("full_name, pan_number, district, village")
    .eq("id", farmerId)
    .single();

  if (!farmer) throw new Error("Farmer not found");

  // Generate farmer ID code: AGRLN-TN-ERODE-001234
  const farmerIdCode = `AGRLN-TN-${farmer.district.toUpperCase()}-${Math.random()
    .toString()
    .slice(2, 8)
    .padStart(6, "0")}`;

  // QR data payload
  const qrData = {
    farmer_id: farmerId,
    farmer_id_code: farmerIdCode,
    farmer_name: farmer.full_name,
    pan: farmer.pan_number,
    district: farmer.district,
    village: farmer.village,
    timestamp: new Date().toISOString(),
  };

  // In production, call QR code generation service
  const qrCodeUrl = await generateQRCode(qrData);

  const { data, error } = await supabase
    .from("farmer_digital_ids")
    .insert({
      farmer_id: farmerId,
      farmer_id_code: farmerIdCode,
      qr_code_data: qrData,
      qr_code_url: qrCodeUrl,
      digital_signature: hashQRData(qrData), // HMAC signature for verification
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// ─── PRODUCT SERVICES ──────────────────────────────────────────────────────

/**
 * Farmers list produce
 * Automatically enforces ownership and verification status via RLS
 */
export const createProductListing = async (productData) => {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Unauthorized");

  // Validate price against mandi reference
  if (
    productData.unit_price < productData.mandi_reference_price * 0.7 ||
    productData.unit_price > productData.mandi_reference_price * 1.5
  ) {
    console.warn(
      `Warning: Price ${productData.unit_price} is far from mandi ${productData.mandi_reference_price}`
    );
  }

  const { data, error } = await supabase
    .from("products")
    .insert({
      farmer_id: user.id,
      name: productData.name,
      category: productData.category,
      description: productData.description,
      unit_price: productData.unit_price,
      mandi_reference_price: productData.mandi_reference_price,
      unit: productData.unit,
      quantity_available: productData.quantity_available,
      is_organic: productData.is_organic,
      is_express_delivery: productData.is_express_delivery,
      certifications: productData.certifications,
      expected_delivery_days: productData.expected_delivery_days,
      image_urls: productData.image_urls,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// ─── ORDER SERVICES ────────────────────────────────────────────────────────

/**
 * Create an order with escrow payment
 * Enforces buyer/farmer role and product ownership via RLS
 */
export const createOrder = async (orderData) => {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Unauthorized");

  // Get product details for pricing breakdown
  const { data: product } = await supabase
    .from("products")
    .select("farmer_id, unit_price, quantity_available")
    .eq("id", orderData.product_id)
    .single();

  if (!product) throw new Error("Product not found");
  if (product.quantity_available < orderData.quantity_ordered) {
    throw new Error(
      `Insufficient stock. Available: ${product.quantity_available}`
    );
  }

  // Calculate amounts
  const subtotal = product.unit_price * orderData.quantity_ordered;
  const platform_fee = subtotal * 0.05; // 5% platform fee
  const tax_amount = platform_fee * 0.18; // 18% GST on fee
  const total_amount = subtotal + platform_fee + tax_amount;

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      buyer_id: user.id,
      farmer_id: product.farmer_id,
      product_id: orderData.product_id,
      quantity_ordered: orderData.quantity_ordered,
      unit_price_at_order: product.unit_price,
      platform_fee,
      tax_amount,
      delivery_address: orderData.delivery_address,
      delivery_by_date: orderData.delivery_by_date,
      status: "pending",
    })
    .select()
    .single();

  if (orderError) throw orderError;

  // Create payment record (escrow not yet captured)
  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .insert({
      order_id: order.id,
      amount: total_amount,
      status: "pending",
    })
    .select()
    .single();

  if (paymentError) throw paymentError;

  return { order, payment, total_amount };
};

/**
 * Farmer confirms order receipt and triggers payout
 */
export const farmerConfirmOrderDelivery = async (orderId) => {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Unauthorized");

  const { data: order } = await supabase
    .from("orders")
    .select("farmer_id, status")
    .eq("id", orderId)
    .single();

  if (!order || order.farmer_id !== user.id) {
    throw new Error("Unauthorized to update this order");
  }

  if (order.status !== "confirmed") {
    throw new Error(`Order must be confirmed before marking delivered`);
  }

  // Update order status
  const { data: updatedOrder, error: updateError } = await supabase
    .from("orders")
    .update({
      status: "delivered",
      delivered_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .select()
    .single();

  if (updateError) throw updateError;

  // In production, trigger payment release from escrow here
  // For now, just log the event
  console.log(`Order ${orderId} marked as delivered. Payout ready.`);

  return updatedOrder;
};

// ─── GOVERNMENT SCHEME SERVICES ────────────────────────────────────────────

/**
 * Govt officers create schemes
 */
export const createGovernmentScheme = async (schemeData) => {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Unauthorized");

  const { data: scheme, error } = await supabase
    .from("government_schemes")
    .insert({
      created_by_dept_id: user.id,
      scheme_code: schemeData.scheme_code,
      scheme_name: schemeData.scheme_name,
      description: schemeData.description,
      eligibility_criteria: schemeData.eligibility_criteria,
      benefit_type: schemeData.benefit_type,
      max_benefit_amount: schemeData.max_benefit_amount,
      effective_from: schemeData.effective_from,
      effective_to: schemeData.effective_to,
      status: "active",
    })
    .select()
    .single();

  if (error) throw error;
  return scheme;
};

/**
 * Farmers apply for government schemes
 */
export const applyForScheme = async (schemeId, documents) => {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Unauthorized");

  // Check farmer eligibility
  const { data: farmer } = await supabase
    .from("profiles")
    .select("farm_size_acres, district")
    .eq("id", user.id)
    .single();

  const { data: scheme } = await supabase
    .from("government_schemes")
    .select("eligibility_criteria")
    .eq("id", schemeId)
    .single();

  // Validate against eligibility criteria
  if (!validateEligibility(farmer, scheme.eligibility_criteria)) {
    throw new Error(
      "You do not meet the eligibility criteria for this scheme"
    );
  }

  const { data: application, error } = await supabase
    .from("scheme_applications")
    .insert({
      farmer_id: user.id,
      scheme_id: schemeId,
      application_status: "draft",
      supporting_documents: documents,
    })
    .select()
    .single();

  if (error) throw error;
  return application;
};

/**
 * Govt officer reviews and approves scheme applications
 */
export const reviewSchemeApplication = async (
  applicationId,
  isApproved,
  benefitAmount,
  rejectionReason
) => {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Unauthorized");

  const application_status = isApproved ? "approved" : "rejected";

  const { data: application, error } = await supabase
    .from("scheme_applications")
    .update({
      application_status,
      reviewed_by_officer_id: user.id,
      reviewed_at: new Date().toISOString(),
      benefit_amount: benefitAmount,
      rejection_reason: rejectionReason,
      approved_at: isApproved ? new Date().toISOString() : null,
    })
    .eq("id", applicationId)
    .select()
    .single();

  if (error) throw error;

  // In production, trigger benefit disbursement workflow here
  if (isApproved) {
    console.log(
      `Scheme application ${applicationId} approved. Disbursing ₹${benefitAmount}...`
    );
  }

  return application;
};

// ─── HELPER FUNCTIONS ──────────────────────────────────────────────────────

/**
 * Validate farmer eligibility for scheme
 */
function validateEligibility(farmer, criteria) {
  if (criteria.districts && !criteria.districts.includes(farmer.district)) {
    return false;
  }
  if (criteria.min_farm_size && farmer.farm_size_acres < criteria.min_farm_size) {
    return false;
  }
  return true;
}

/**
 * Generate QR code (mock implementation)
 * In production, use qrcode or similar library
 */
async function generateQRCode(data) {
  // Mock URL: in production, would generate actual QR PNG/SVG
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    JSON.stringify(data)
  )}`;
}

/**
 * Hash QR data for signature (mock)
 */
function hashQRData(data) {
  // In production, use crypto.createHmac() with signing key
  return `sig_${Math.random().toString(36).slice(2, 9)}`;
}

export default {
  createFarmerProfile,
  verifyFarmerProfile,
  createFarmerDigitalId,
  createProductListing,
  createOrder,
  farmerConfirmOrderDelivery,
  createGovernmentScheme,
  applyForScheme,
  reviewSchemeApplication,
};
