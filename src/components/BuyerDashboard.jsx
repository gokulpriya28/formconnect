import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient.js";
import agriLensServices from "../../services/agriLensServices.js";

// ============================================================================
// BUYER DASHBOARD — Marketplace, Orders, Invoices, Procurement
// ============================================================================

export function BuyerDashboard({ profile }) {
  const [tab, setTab] = useState("marketplace");
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadBuyerData();
  }, []);

  const loadBuyerData = async () => {
    setLoading(true);

    // Load marketplace products
    let query = supabase
      .from("products")
      .select("*, profiles(full_name, district)")
      .eq("is_active", true);

    if (selectedCategory !== "all") {
      query = query.eq("category", selectedCategory);
    }

    const { data: prods } = await query;
    setProducts(prods || []);

    // Load buyer's orders
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: ords } = await supabase
        .from("orders")
        .select("*, products(name, emoji), profiles(full_name)")
        .eq("buyer_id", user.id);
      setOrders(ords || []);
    }

    setLoading(false);
  };

  const handlePlaceOrder = async (productId) => {
    const qty = prompt("Enter quantity:");
    if (!qty) return;

    try {
      const result = await agriLensServices.createOrder({
        product_id: productId,
        quantity_ordered: parseInt(qty),
        delivery_address: "Buyer's registered address",
        delivery_by_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      });
      alert(`Order placed! Amount: ₹${result.total_amount.toFixed(2)}`);
      loadBuyerData();
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.profiles?.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: "28px", background: "#FAFAF7", minHeight: "100vh" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "32px" }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#1b4332", marginBottom: 8 }}>
            🛒 Buyer Dashboard
          </div>
          <div style={{ fontSize: 14, color: "#6b7280" }}>
            Discover fresh produce directly from verified farmers
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24, borderBottom: "1px solid #e5e7eb", paddingBottom: 0 }}>
          {[
            { id: "marketplace", label: "🌾 Marketplace" },
            { id: "orders", label: "📦 My Orders" },
            { id: "invoices", label: "📄 Invoices" },
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
        <div>
          {tab === "marketplace" && (
            <div>
              {/* Search & Filter */}
              <div style={{ marginBottom: 24, display: "flex", gap: 12, alignItems: "center" }}>
                <input
                  type="text"
                  placeholder="Search products or farmers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "10px 12px",
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    fontSize: 14,
                  }}
                />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  style={{
                    padding: "10px 12px",
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    fontSize: 14,
                  }}
                >
                  <option value="all">All Categories</option>
                  <option value="Vegetables">Vegetables</option>
                  <option value="Fruits">Fruits</option>
                  <option value="Grains">Grains</option>
                  <option value="Spices">Spices</option>
                </select>
              </div>

              {/* Products Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: 16,
                }}
              >
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    style={{
                      background: "#ffffff",
                      border: "1px solid #e5e7eb",
                      borderRadius: 12,
                      overflow: "hidden",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                      transition: "box-shadow 0.2s",
                    }}
                  >
                    {/* Image placeholder */}
                    <div
                      style={{
                        background: "linear-gradient(135deg, #d1fae5, #a7f3d0)",
                        height: 140,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 48,
                      }}
                    >
                      {product.emoji || "🥬"}
                    </div>

                    <div style={{ padding: 12 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#1b4332", marginBottom: 2 }}>
                        {product.name}
                      </div>
                      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
                        by {product.profiles?.full_name}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 8,
                        }}
                      >
                        <div style={{ fontSize: 14, fontWeight: 800, color: "#1b4332" }}>
                          ₹{product.unit_price}/{product.unit}
                        </div>
                        <div style={{ fontSize: 12, color: "#16a34a", fontWeight: 600 }}>
                          ⭐ {product.average_rating || 4.8}
                        </div>
                      </div>

                      <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 8 }}>
                        {product.quantity_available} in stock • {product.total_orders} orders
                      </div>

                      {product.is_organic && (
                        <div
                          style={{
                            background: "#dcfce7",
                            color: "#16a34a",
                            padding: "4px 8px",
                            borderRadius: 4,
                            fontSize: 10,
                            fontWeight: 600,
                            marginBottom: 8,
                            display: "inline-block",
                          }}
                        >
                          🌱 Certified Organic
                        </div>
                      )}

                      <button
                        onClick={() => handlePlaceOrder(product.id)}
                        style={{
                          width: "100%",
                          background: "#2d6a4f",
                          color: "white",
                          border: "none",
                          padding: "8px 12px",
                          borderRadius: 6,
                          fontWeight: 600,
                          cursor: "pointer",
                          fontSize: 12,
                        }}
                      >
                        Place Order
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "orders" && (
            <div style={{ background: "#ffffff", borderRadius: 12, border: "1px solid #e5e7eb", padding: 20 }}>
              <div style={{ display: "grid", gap: 12 }}>
                {orders.length === 0 ? (
                  <div style={{ textAlign: "center", color: "#6b7280", padding: "32px 0" }}>
                    No orders yet. Start shopping!
                  </div>
                ) : (
                  orders.map((order) => (
                    <div
                      key={order.id}
                      style={{
                        background: "#f9fafb",
                        border: "1px solid #e5e7eb",
                        borderRadius: 10,
                        padding: 12,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "start",
                          marginBottom: 8,
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, color: "#1b4332" }}>
                            {order.products?.emoji} {order.products?.name}
                          </div>
                          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                            From {order.profiles?.full_name} • Qty: {order.quantity_ordered}
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
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 12,
                          color: "#6b7280",
                        }}
                      >
                        <span>Delivery: {order.delivery_by_date}</span>
                        <span style={{ fontWeight: 700, color: "#1b4332" }}>
                          ₹{order.total_amount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {tab === "invoices" && (
            <div style={{ background: "#ffffff", borderRadius: 12, border: "1px solid #e5e7eb", padding: 20 }}>
              <div style={{ textAlign: "center", color: "#6b7280", padding: "32px 0" }}>
                📄 Invoices will be available for delivered orders
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default BuyerDashboard;
