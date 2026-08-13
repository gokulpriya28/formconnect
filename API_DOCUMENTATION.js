// ============================================================================
// AgriLens Platform — API Documentation & Backend Service Reference
// ============================================================================

/**
 * SERVICE MODULE: agriLensServices.js
 * Location: src/services/agriLensServices.js
 * 
 * This module provides all backend business logic that enforces RLS policies
 * and implements core AgriLens workflows. All functions validate user permissions
 * before executing database operations.
 */

// ─── PROFILE SERVICES ──────────────────────────────────────────────────────

/**
 * Create or update a farmer profile
 * 
 * @param {Object} profileData - Farmer profile information
 * @param {string} profileData.full_name - Farmer's full name
 * @param {string} profileData.pan_number - PAN (Tax ID) - Required for farmers
 * @param {string} profileData.aadhar_number - Aadhar ID (optional)
 * @param {number} profileData.farm_size_acres - Farm size in acres
 * @param {string} profileData.irrigation_type - Type of irrigation (drip, flood, etc)
 * @param {string} profileData.district - District name
 * @param {string} profileData.village - Village name
 * @param {number} profileData.latitude - GPS latitude
 * @param {number} profileData.longitude - GPS longitude
 * 
 * @returns {Promise<Object>} Created/updated profile object
 * 
 * @example
 * const profile = await createFarmerProfile({
 *   full_name: "Ravi Kumar",
 *   pan_number: "ABCDE1234F",
 *   farm_size_acres: 2.5,
 *   irrigation_type: "drip",
 *   district: "Erode",
 *   village: "Sengodu"
 * });
 * 
 * @security
 * - User must be authenticated (logged in)
 * - Role automatically set to 'farmer'
 * - Validation: PAN and farm_size_acres are required
 * - RLS policy: Only user can create own profile
 */

export const createFarmerProfile = async (profileData) => {
  // Implementation in src/services/agriLensServices.js (lines 24-67)
};

/**
 * Verify a farmer profile (ADMIN ONLY)
 * Issues digital farmer ID upon approval
 * 
 * @param {string} farmerId - User ID of farmer to verify
 * @param {boolean} isApproved - Approval status
 * @param {string} documentUrl - URL to verification document
 * 
 * @returns {Promise<Object>} Updated profile with verification_status
 * 
 * @example
 * await verifyFarmerProfile(
 *   "123e4567-e89b-12d3-a456-426614174000",
 *   true,
 *   "https://storage.example.com/farmer-docs/pan-doc.pdf"
 * );
 * 
 * @security
 * - ADMIN ONLY: Throws "Only admins can verify" if non-admin attempts
 * - Auto-creates farmer_digital_ids record on approval
 * - Logs verification action to audit_logs
 * - Sets verification_status to 'verified' or 'rejected'
 */

export const verifyFarmerProfile = async (farmerId, isApproved, documentUrl) => {
  // Implementation in src/services/agriLensServices.js (lines 75-112)
};

// ─── FARMER DIGITAL ID SERVICES ────────────────────────────────────────────

/**
 * Create farmer digital ID with QR code
 * Called automatically after farmer verification by admin
 * 
 * @param {string} farmerId - User ID of verified farmer
 * 
 * @returns {Promise<Object>} Digital ID record with QR code details
 * 
 * @example
 * const digitalId = await createFarmerDigitalId(
 *   "123e4567-e89b-12d3-a456-426614174000"
 * );
 * // Returns:
 * // {
 * //   id: "uuid",
 * //   farmer_id_code: "AGRLN-TN-ERODE-123456",
 * //   qr_code_url: "https://api.qrserver.com/v1/...",
 * //   digital_signature: "sig_abc123",
 * //   physical_card_status: "not_requested",
 * //   created_at: "2024-01-15T10:30:00Z"
 * // }
 * 
 * @security
 * - Generated farmer_id_code format: AGRLN-STATE-DISTRICT-SEQNUM
 * - QR code contains: farmer_id, farmer_id_code, name, PAN, district, timestamp
 * - Digital signature prevents QR tampering
 * - Only admin can create via verifyFarmerProfile
 */

export const createFarmerDigitalId = async (farmerId) => {
  // Implementation in src/services/agriLensServices.js (lines 120-158)
};

// ─── PRODUCT LISTING SERVICES ──────────────────────────────────────────────

/**
 * Create a product listing (farmer marketplace listing)
 * Only verified farmers can list products
 * 
 * @param {Object} productData - Product information
 * @param {string} productData.name - Product name
 * @param {string} productData.category - Category (Vegetables, Fruits, Grains, etc)
 * @param {number} productData.unit_price - Price per unit (₹)
 * @param {number} productData.mandi_reference_price - Reference market price
 * @param {string} productData.unit - Unit (kg, litre, dozen, etc)
 * @param {number} productData.quantity_available - Stock quantity
 * @param {boolean} productData.is_organic - Certified organic?
 * @param {boolean} productData.is_express_delivery - Express delivery available?
 * @param {Array<string>} productData.certifications - Certificate names
 * @param {number} productData.expected_delivery_days - Delivery timeframe
 * @param {Array<string>} productData.image_urls - Product images (max 10)
 * 
 * @returns {Promise<Object>} Created product object
 * 
 * @example
 * const product = await createProductListing({
 *   name: "Fresh Tomatoes",
 *   category: "Vegetables",
 *   unit_price: 50,
 *   mandi_reference_price: 48,
 *   unit: "kg",
 *   quantity_available: 500,
 *   is_organic: true,
 *   is_express_delivery: true,
 *   expected_delivery_days: 1
 * });
 * 
 * @security
 * - VERIFIED FARMERS ONLY: Throws error if farmer not verified
 * - Automatic ownership: farmer_id = current user
 * - Price validation: Must be within 70-150% of mandi reference
 * - RLS policy: Only farmer can see own inactive listings
 * - Image limit: Max 10 images per product
 */

export const createProductListing = async (productData) => {
  // Implementation in src/services/agriLensServices.js (lines 166-207)
};

// ─── ORDER & PAYMENT SERVICES ──────────────────────────────────────────────

/**
 * Create order with automatic escrow payment
 * 
 * @param {Object} orderData - Order details
 * @param {string} orderData.product_id - Product UUID
 * @param {number} orderData.quantity_ordered - Quantity to purchase
 * @param {string} orderData.delivery_address - Delivery address
 * @param {string} orderData.delivery_by_date - Expected delivery date (YYYY-MM-DD)
 * 
 * @returns {Promise<Object>} { order, payment, total_amount }
 * 
 * @example
 * const { order, payment, total_amount } = await createOrder({
 *   product_id: "prod-uuid",
 *   quantity_ordered: 10,
 *   delivery_address: "123 Main St, Bangalore",
 *   delivery_by_date: "2024-02-01"
 * });
 * // total_amount includes:
 * // - Subtotal (product price × quantity)
 * // - Platform fee (5% of subtotal)
 * // - GST (18% of platform fee)
 * // - Farmer payout (90% of subtotal)
 * 
 * @security
 * - BUYERS ONLY: Requires buyer role
 * - Stock validation: Checks quantity_available
 * - Automatic calculation: Prevents manual price manipulation
 * - Payment status: 'pending' until Razorpay confirms
 * - Audit logged: All order creation logged to audit_logs
 */

export const createOrder = async (orderData) => {
  // Implementation in src/services/agriLensServices.js (lines 215-275)
};

/**
 * Farmer confirms order delivery
 * Triggers payment release from escrow
 * 
 * @param {string} orderId - Order UUID
 * 
 * @returns {Promise<Object>} Updated order with status='delivered'
 * 
 * @example
 * const order = await farmerConfirmOrderDelivery("order-uuid");
 * // Status flow: pending → confirmed → dispatched → delivered
 * // On 'delivered', farmer payout is triggered
 * 
 * @security
 * - FARMER OWNERSHIP: Only farmer can confirm their own orders
 * - STATE VALIDATION: Order must be 'confirmed' status
 * - ESCROW RELEASE: Triggers payment from escrow (in production)
 * - Audit logged: Delivery confirmation logged
 */

export const farmerConfirmOrderDelivery = async (orderId) => {
  // Implementation in src/services/agriLensServices.js (lines 283-312)
};

// ─── GOVERNMENT SCHEME SERVICES ────────────────────────────────────────────

/**
 * Create government benefit scheme (GOVERNMENT OFFICERS ONLY)
 * 
 * @param {Object} schemeData - Scheme details
 * @param {string} schemeData.scheme_code - Unique scheme code
 * @param {string} schemeData.scheme_name - Public scheme name
 * @param {string} schemeData.description - Benefit description
 * @param {Object} schemeData.eligibility_criteria - JSONB eligibility rules
 *   @param {Array<string>} eligibility_criteria.districts - Eligible districts
 *   @param {number} eligibility_criteria.min_farm_size - Min farm size in acres
 *   @param {Array<string>} eligibility_criteria.crops - Eligible crops (optional)
 * @param {string} schemeData.benefit_type - Type: 'cash_subsidy', 'credit', 'insurance'
 * @param {number} schemeData.max_benefit_amount - Maximum benefit per farmer (₹)
 * @param {string} schemeData.effective_from - Start date (YYYY-MM-DD)
 * @param {string} schemeData.effective_to - End date (YYYY-MM-DD)
 * 
 * @returns {Promise<Object>} Created scheme record
 * 
 * @example
 * const scheme = await createGovernmentScheme({
 *   scheme_code: "PM-KISAN-2024",
 *   scheme_name: "PM-KISAN Scheme",
 *   description: "₹6000 annual income support for farmers",
 *   eligibility_criteria: {
 *     districts: ["Erode", "Coimbatore", "Salem"],
 *     min_farm_size: 0.1,
 *     crops: ["rice", "sugarcane", "cotton"]
 *   },
 *   benefit_type: "cash_subsidy",
 *   max_benefit_amount: 6000,
 *   effective_from: "2024-01-01",
 *   effective_to: "2024-12-31"
 * });
 * 
 * @security
 * - GOVERNMENT ONLY: Requires govt role
 * - Created by: Logged as created_by_dept_id
 * - Auto-published: Status set to 'active' immediately
 * - Visible to all farmers in dashboard
 */

export const createGovernmentScheme = async (schemeData) => {
  // Implementation in src/services/agriLensServices.js (lines 320-349)
};

/**
 * Farmer applies for government scheme
 * 
 * @param {string} schemeId - Scheme UUID
 * @param {Object} documents - Supporting documents (URLs stored in JSONB)
 *   @param {string} documents.pan_certificate - PAN certificate URL
 *   @param {string} documents.land_record - Land ownership proof URL
 *   @param {string} documents.bank_account - Bank account details URL
 * 
 * @returns {Promise<Object>} Scheme application record
 * 
 * @example
 * const application = await applyForScheme("scheme-uuid", {
 *   pan_certificate: "https://storage.example.com/pan.pdf",
 *   land_record: "https://storage.example.com/land-doc.pdf",
 *   bank_account: "https://storage.example.com/bank-proof.pdf"
 * });
 * // application_status starts as 'draft'
 * 
 * @security
 * - FARMERS ONLY: Requires farmer role
 * - ELIGIBILITY CHECK: Validates against eligibility_criteria
 *   - Geographic match: Farmer district must be in scheme.eligibility_criteria.districts
 *   - Farm size: farmer.farm_size_acres >= eligibility_criteria.min_farm_size
 * - DUPLICATE PREVENTION: Can't apply twice to same scheme
 * - Throws: "You do not meet the eligibility criteria for this scheme"
 */

export const applyForScheme = async (schemeId, documents) => {
  // Implementation in src/services/agriLensServices.js (lines 357-397)
};

/**
 * Review scheme application (GOVERNMENT OFFICERS ONLY)
 * Approves or rejects with benefit amount
 * 
 * @param {string} applicationId - Application UUID
 * @param {boolean} isApproved - Approval decision
 * @param {number} benefitAmount - Benefit amount (₹) if approved
 * @param {string} rejectionReason - Reason if rejected
 * 
 * @returns {Promise<Object>} Updated application record
 * 
 * @example
 * // Approve with ₹5000 benefit
 * const app = await reviewSchemeApplication(
 *   "app-uuid",
 *   true,
 *   5000,
 *   null
 * );
 * 
 * // Or reject
 * const app = await reviewSchemeApplication(
 *   "app-uuid",
 *   false,
 *   null,
 *   "Farm size does not meet minimum requirement"
 * );
 * 
 * @security
 * - GOVERNMENT ONLY: Only govt/admin role can review
 * - WORKFLOW STATE: Application must be 'submitted' status
 * - Sets reviewed_by_officer_id to current user
 * - On approval: Triggers benefit disbursement (in production)
 * - Audit logged: All approvals/rejections tracked
 */

export const reviewSchemeApplication = async (
  applicationId,
  isApproved,
  benefitAmount,
  rejectionReason
) => {
  // Implementation in src/services/agriLensServices.js (lines 405-449)
};

// ─── DATA ACCESS PATTERNS ──────────────────────────────────────────────────

/**
 * READING DATA (SELECT QUERIES)
 * All read operations are automatically filtered by RLS policies
 * 
 * Example: Get farmer's own products
 * const { data: products } = await supabase
 *   .from("products")
 *   .select("*")
 *   .eq("farmer_id", currentUserId);
 * 
 * RLS POLICY AUTOMATICALLY APPLIES:
 * - User can see their own products (including inactive)
 * - Buyers can only see active products from other farmers
 * - Admin can see all products
 * 
 * NEVER RELY ON FRONTEND LOGIC FOR FILTERING
 * The RLS policy is the primary security layer
 */

/**
 * WRITING DATA (INSERT/UPDATE/DELETE QUERIES)
 * All write operations are validated by:
 * 1. RLS policies (database level - primary)
 * 2. Input validation (frontend level - secondary)
 * 3. Audit triggers (logging for compliance)
 * 
 * Example: Farmer creates product
 * const { data, error } = await supabase
 *   .from("products")
 *   .insert({
 *     farmer_id: auth.uid(),
 *     name: "Tomatoes",
 *     ...productData
 *   })
 *   .select();
 * 
 * RLS POLICY CHECK:
 * - Is user role 'farmer'?
 * - Is farmer verified (is_verified = true)?
 * - Does farmer.id = auth.uid()?
 * 
 * If any check fails: 401 Unauthorized, data not inserted
 */

// ─── ERROR HANDLING ────────────────────────────────────────────────────────

/**
 * Common error responses and meanings:
 * 
 * "Unauthorized" or 401
 *   → User not logged in, or JWT expired
 *   → Solution: Call auth.signIn() again
 * 
 * "Only admins can verify farmer profiles"
 *   → Attempted admin operation without admin role
 *   → Solution: User must have role='admin'
 * 
 * "Farmers must provide PAN and farm size"
 *   → Missing required farmer profile fields
 *   → Solution: Include all required fields in profileData
 * 
 * "You do not meet the eligibility criteria for this scheme"
 *   → Farmer doesn't match scheme's eligibility_criteria rules
 *   → Solution: Check district and farm size against scheme rules
 * 
 * "Insufficient stock. Available: X"
 *   → Product quantity_available < quantity_ordered
 *   → Solution: Order less quantity or choose different product
 * 
 * "Only verified farmers can list products"
 *   → Farmer account not verified by admin yet
 *   → Solution: Wait for admin verification or contact support
 */

// ─── TRANSACTION EXAMPLES ──────────────────────────────────────────────────

/**
 * COMPLETE FARMER WORKFLOW
 * 
 * 1. Farmer signs up (email/phone auth)
 *    → profiles record created with role='farmer'
 * 
 * 2. Farmer fills farm details
 *    await createFarmerProfile({ name, pan, farm_size, ... })
 * 
 * 3. Admin verifies farmer
 *    await verifyFarmerProfile(farmerId, true, docUrl)
 *    → farmer_digital_ids created automatically
 *    → QR code generated
 *    → Farmer can now list products
 * 
 * 4. Farmer lists produce
 *    await createProductListing({ name, price, quantity, ... })
 * 
 * 5. Buyer purchases
 *    await createOrder({ productId, quantity, address, ... })
 * 
 * 6. Payment processed
 *    Razorpay webhook confirms payment
 *    → payments.status = 'completed'
 *    → orders.status = 'confirmed'
 * 
 * 7. Farmer delivers
 *    await farmerConfirmOrderDelivery(orderId)
 *    → Escrow payment released to farmer
 *    → Farmer earns 90% of subtotal
 * 
 * 8. Farmer applies for scheme
 *    await applyForScheme(schemeId, { documents })
 * 
 * 9. Government reviews & approves
 *    await reviewSchemeApplication(appId, true, benefitAmount, null)
 *    → Benefit disbursed to farmer's bank account
 */

/**
 * COMPLETE GOVERNMENT SCHEME WORKFLOW
 * 
 * 1. Government officer logs in with role='govt'
 * 
 * 2. Officer creates scheme
 *    await createGovernmentScheme({
 *      scheme_code, scheme_name, description,
 *      eligibility_criteria, benefit_type, max_benefit_amount,
 *      effective_from, effective_to
 *    })
 * 
 * 3. Scheme appears in farmer dashboards (auto-filtered by eligibility)
 * 
 * 4. Eligible farmers apply
 *    await applyForScheme(schemeId, { documents })
 * 
 * 5. Officer reviews pending applications
 *    GovernmentDashboard → Applications tab
 * 
 * 6. Officer approves/rejects
 *    await reviewSchemeApplication(appId, approved, amount, reason)
 * 
 * 7. Approved benefits tracked
 *    Farmer can see in scheme_applications with status='approved'
 *    Payment disbursed at configured schedule
 * 
 * 8. Analytics available
 *    - Total applications
 *    - Approval rate
 *    - Total benefits disbursed
 *    - District-wise distribution
 */

// ─── TESTING THE SERVICES ──────────────────────────────────────────────────

/**
 * MANUAL TESTING IN BROWSER CONSOLE:
 * 
 * // Test 1: Create farmer profile
 * import agriLensServices from './services/agriLensServices.js';
 * 
 * const profile = await agriLensServices.createFarmerProfile({
 *   full_name: "Test Farmer",
 *   pan_number: "TEST1234P",
 *   farm_size_acres: 2.5,
 *   irrigation_type: "drip",
 *   district: "Erode",
 *   village: "Test Village"
 * });
 * console.log("Profile created:", profile);
 * 
 * // Test 2: Try to list product (should fail - not verified)
 * try {
 *   await agriLensServices.createProductListing({...});
 * } catch (error) {
 *   console.log("Expected error:", error.message);
 *   // "You do not meet the eligibility criteria for this scheme"
 * }
 * 
 * // Test 3: Admin verifies (requires admin auth)
 * const verified = await agriLensServices.verifyFarmerProfile(farmerId, true, docUrl);
 * 
 * // Test 4: Now farmer can list products
 * const product = await agriLensServices.createProductListing({...});
 * console.log("Product listed:", product);
 */

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
