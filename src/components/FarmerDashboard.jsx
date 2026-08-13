import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient.js";
import agriLensServices from "../../services/agriLensServices.js";

// ============================================================================
// FARMER DASHBOARD — Farm Management, Products, Orders, Schemes, Farmer ID
// ============================================================================

export function FarmerDashboard({ profile }) {
  const [tab, setTab] = useState("overview");
  const [farmData, setFarmData] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [farmerId, setFarmerId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFarmerData();
  }, []);

  const loadFarmerData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setLoading(true);

    // Load profile
    const { data: prof } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    setFarmData(prof);

    // Load digital ID
    const { data: did } = await supabase
      .from("farmer_digital_ids")
      .select("*")
      .eq("farmer_id", user.id)
      .single();
    setFarmerId(did);

    // Load products
    const { data: prods } = await supabase
      .from("products")
      .select("*")
      .eq("farmer_id", user.id);
    setProducts(prods || []);

    // Load orders
    const { data: ords } = await supabase
      .from("orders")
      .select("*, products(name, emoji)")
      .eq("farmer_id", user.id);
    setOrders(ords || []);

    // Load available schemes
    const { data: schem } = await supabase
      .from("government_schemes")
      .select("*")
      .eq("status", "active");
    setSchemes(schem || []);

    setLoading(false);
  };

  const handleAddProduct = async (productData) => {
    try {
      const result = await agriLensServices.createProductListing(productData);
      setProducts([...products, result]);
    } catch (error) {
      console.error("Error adding product:", error);
    }
  };

  return (
    <div style={{ padding: "28px", background: "#FAFAF7", minHeight: "100vh" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "32px" }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#1b4332", marginBottom: 8 }}>
            🌱 Farmer Dashboard
          </div>
          <div style={{ fontSize: 14, color: "#6b7280" }}>
            {farmData?.full_name} • {farmData?.farm_size_acres} acres • {farmData?.district}
          </div>
        </div>

        {/* Farmer ID Card */}
        {farmerId && (
          <div style={{
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: "16px 20px",
            marginBottom: 24,
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#6b7280", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 }}>
              Digital Farmer ID
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#1b4332", marginBottom: 4 }}>
                  {farmerId.farmer_id_code}
                </div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  Status: <span style={{ fontWeight: 600, color: farmerId.physical_card_status === "issued" ? "#16a34a" : "#f59e0b" }}>
                    {farmerId.physical_card_status}
                  </span>
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                {farmerId.qr_code_url && (
                  <img src={farmerId.qr_code_url} alt="Farmer QR Code" style={{ width: 100, height: 100 }} />
                )}
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>Scan to verify</div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24, borderBottom: "1px solid #e5e7eb", paddingBottom: 0 }}>
          {[
            { id: "overview", label: "📊 Overview" },
            { id: "products", label: "🥬 My Products" },
            { id: "orders", label: "📦 Orders" },
            { id: "schemes", label: "💰 Schemes" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "12px 16px",
                background: "transparent",
                border: "none",
                borderBottom: tab === t.id ? "2px solid #2d6a4f" : "2px solid transparent",
                color: tab === t.id ? "#1b4332" : "#6b7280",
                fontWeight: tab === t.id ? 700 : 500,
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ background: "#ffffff", borderRadius: 12, border: "1px solid #e5e7eb", padding: 20 }}>
          {tab === "overview" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16 }}>
                <div style={{ background: "#f0fdf4", padding: 16, borderRadius: 10 }}>
                  <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Active Products</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#16a34a", marginTop: 4 }}>
                    {products.filter((p) => p.is_active).length}
                  </div>
                </div>
                <div style={{ background: "#fef3c7", padding: 16, borderRadius: 10 }}>
                  <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Pending Orders</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#f59e0b", marginTop: 4 }}>
                    {orders.filter((o) => o.status === "pending").length}
                  </div>
                </div>
                <div style={{ background: "#dbeafe", padding: 16, borderRadius: 10 }}>
                  <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Avg Rating</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#0284c7", marginTop: 4 }}>
                    ⭐ {(products.reduce((sum, p) => sum + (p.average_rating || 0), 0) / (products.length || 1)).toFixed(1)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "products" && (
            <div>
              <button
                onClick={() => {
                  const productData = {
                    name: "Tomatoes",
                    category: "Vegetables",
                    unit_price: 50,
                    mandi_reference_price: 48,
                    unit: "kg",
                    quantity_available: 100,
                    is_organic: true,
                    expected_delivery_days: 1,
                  };
                  handleAddProduct(productData);
                }}
                style={{
                  background: "#2d6a4f",
                  color: "white",
                  border: "none",
                  padding: "10px 16px",
                  borderRadius: 8,
                  fontWeight: 600,
                  marginBottom: 16,
                  cursor: "pointer",
                }}
              >
                + Add Product
              </button>
              <div style={{ display: "grid", gap: 12 }}>
                {products.map((product) => (
                  <div
                    key={product.id}
                    style={{
                      background: "#f9fafb",
                      border: "1px solid #e5e7eb",
                      borderRadius: 10,
                      padding: 12,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: "#1b4332" }}>
                        {product.emoji} {product.name}
                      </div>
                      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                        ₹{product.unit_price}/{product.unit} • {product.quantity_available} in stock • {product.total_orders} sold
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#16a34a" }}>
                        ⭐ {product.average_rating || 4.8}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "orders" && (
            <div style={{ display: "grid", gap: 12 }}>
              {orders.map((order) => (
                <div
                  key={order.id}
                  style={{
                    background: "#f9fafb",
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    padding: 12,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                    <div>
                      <div style={{ fontWeight: 700, color: "#1b4332" }}>
                        {order.products?.emoji} {order.products?.name} × {order.quantity_ordered}
                      </div>
                      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                        Delivery: {order.delivery_by_date} • ₹{order.total_amount.toFixed(2)}
                      </div>
                    </div>
                    <div
                      style={{
                        background:
                          order.status === "delivered"
                            ? "#dcfce7"
                            : order.status === "pending"
                              ? "#fef3c7"
                              : "#e0e7ff",
                        color:
                          order.status === "delivered"
                            ? "#16a34a"
                            : order.status === "pending"
                              ? "#d97706"
                              : "#4f46e5",
                        padding: "4px 8px",
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      {order.status.toUpperCase()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "schemes" && (
            <div style={{ display: "grid", gap: 12 }}>
              {schemes.map((scheme) => (
                <div
                  key={scheme.id}
                  style={{
                    background: "#f9fafb",
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    padding: 12,
                  }}
                >
                  <div style={{ fontWeight: 700, color: "#1b4332", marginBottom: 4 }}>
                    {scheme.scheme_name}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
                    {scheme.description}
                  </div>
                  <button
                    onClick={() => console.log("Apply for scheme", scheme.id)}
                    style={{
                      background: "#2d6a4f",
                      color: "white",
                      border: "none",
                      padding: "6px 12px",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Apply Now
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FarmerDashboard;
