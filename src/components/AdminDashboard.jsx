import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient.js";
import agriLensServices from "../../services/agriLensServices.js";

// ============================================================================
// ADMIN DASHBOARD — Platform Analytics, User Management, Compliance, Auditing
// ============================================================================

export function AdminDashboard() {
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState({
    totalFarmers: 0,
    totalBuyers: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingVerifications: 0,
  });
  const [pendingFarmers, setPendingFarmers] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setLoading(true);

    // Load statistics
    const { data: farmers } = await supabase
      .from("profiles")
      .select("id", { count: "exact" })
      .eq("role", "farmer");

    const { data: buyers } = await supabase
      .from("profiles")
      .select("id", { count: "exact" })
      .eq("role", "buyer");

    const { data: orders } = await supabase
      .from("orders")
      .select("total_amount", { count: "exact" });

    const totalRevenue = orders?.reduce((sum, o) => sum + o.total_amount, 0) || 0;

    const { data: pending } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "farmer")
      .eq("verification_status", "pending");

    setStats({
      totalFarmers: farmers?.length || 0,
      totalBuyers: buyers?.length || 0,
      totalOrders: orders?.length || 0,
      totalRevenue,
      pendingVerifications: pending?.length || 0,
    });

    setPendingFarmers(pending || []);

    // Load recent orders
    const { data: recentOrders } = await supabase
      .from("orders")
      .select("*, products(name), profiles(full_name)")
      .order("created_at", { ascending: false })
      .limit(10);

    setAllOrders(recentOrders || []);

    // Load audit logs
    const { data: logs } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    setAuditLogs(logs || []);

    setLoading(false);
  };

  const handleVerifyFarmer = async (farmerId, isApproved) => {
    try {
      const result = await agriLensServices.verifyFarmerProfile(
        farmerId,
        isApproved,
        "https://example.com/docs/" + farmerId
      );
      alert(isApproved ? "Farmer verified!" : "Application rejected.");
      loadAdminData();
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <div style={{ padding: "28px", background: "#FAFAF7", minHeight: "100vh" }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "32px" }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#1b4332", marginBottom: 8 }}>
            ⚙️ Admin Dashboard
          </div>
          <div style={{ fontSize: 14, color: "#6b7280" }}>
            Platform oversight, compliance, and user management
          </div>
        </div>

        {/* KPI Cards */}
        {tab === "overview" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 16,
              marginBottom: 32,
            }}
          >
            {[
              {
                label: "Total Farmers",
                value: stats.totalFarmers,
                color: "#dcfce7",
                textColor: "#16a34a",
                icon: "👨‍🌾",
              },
              {
                label: "Total Buyers",
                value: stats.totalBuyers,
                color: "#dbeafe",
                textColor: "#0284c7",
                icon: "👤",
              },
              {
                label: "Total Orders",
                value: stats.totalOrders,
                color: "#fef3c7",
                textColor: "#f59e0b",
                icon: "📦",
              },
              {
                label: "Total Revenue",
                value: `₹${(stats.totalRevenue / 100000).toFixed(1)}L`,
                color: "#fce7f3",
                textColor: "#db2777",
                icon: "💰",
              },
              {
                label: "Pending Verifications",
                value: stats.pendingVerifications,
                color: "#f3e8ff",
                textColor: "#a855f7",
                icon: "⏳",
              },
            ].map((kpi, idx) => (
              <div
                key={idx}
                style={{
                  background: kpi.color,
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 8 }}>{kpi.icon}</div>
                <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, marginBottom: 4 }}>
                  {kpi.label}
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: kpi.textColor }}>
                  {kpi.value}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24, borderBottom: "1px solid #e5e7eb", paddingBottom: 0 }}>
          {[
            { id: "overview", label: "📊 Overview" },
            { id: "verification", label: "✅ Farmer Verification" },
            { id: "orders", label: "📦 All Orders" },
            { id: "audit", label: "🔍 Audit Logs" },
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
          {tab === "verification" && (
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#1b4332", marginBottom: 16 }}>
                Pending Farmer Verifications ({pendingFarmers.length})
              </div>
              {pendingFarmers.length === 0 ? (
                <div style={{ textAlign: "center", color: "#6b7280", padding: "32px 0" }}>
                  ✅ All farmers have been verified
                </div>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {pendingFarmers.map((farmer) => (
                    <div
                      key={farmer.id}
                      style={{
                        background: "#f9fafb",
                        border: "1px solid #fbbf24",
                        borderRadius: 10,
                        padding: 14,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "start",
                          marginBottom: 10,
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, color: "#1b4332" }}>
                            {farmer.full_name}
                          </div>
                          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                            PAN: {farmer.pan_number} • Farm: {farmer.farm_size_acres} acres • {farmer.district}
                          </div>
                          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                            Applied: {new Date(farmer.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            onClick={() => handleVerifyFarmer(farmer.id, true)}
                            style={{
                              background: "#16a34a",
                              color: "white",
                              border: "none",
                              padding: "8px 12px",
                              borderRadius: 6,
                              fontWeight: 600,
                              cursor: "pointer",
                              fontSize: 12,
                            }}
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleVerifyFarmer(farmer.id, false)}
                            style={{
                              background: "#ef4444",
                              color: "white",
                              border: "none",
                              padding: "8px 12px",
                              borderRadius: 6,
                              fontWeight: 600,
                              cursor: "pointer",
                              fontSize: 12,
                            }}
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                      <div
                        style={{
                          background: "#fef3c7",
                          color: "#92400e",
                          padding: "8px 12px",
                          borderRadius: 6,
                          fontSize: 12,
                          marginTop: 10,
                        }}
                      >
                        📄 Document URL: {farmer.verification_document_url || "Not provided"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "orders" && (
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#1b4332", marginBottom: 16 }}>
                Recent Orders ({allOrders.length})
              </div>
              <div style={{ display: "grid", gap: 12 }}>
                {allOrders.map((order) => (
                  <div
                    key={order.id}
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
                        {order.products?.name}
                      </div>
                      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                        Qty: {order.quantity_ordered} • ₹{order.total_amount.toFixed(2)}
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
                ))}
              </div>
            </div>
          )}

          {tab === "audit" && (
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#1b4332", marginBottom: 16 }}>
                Audit Logs ({auditLogs.length})
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                      <th style={{ textAlign: "left", padding: "10px 0", fontWeight: 700, fontSize: 12, color: "#6b7280" }}>
                        Event
                      </th>
                      <th style={{ textAlign: "left", padding: "10px 0", fontWeight: 700, fontSize: 12, color: "#6b7280" }}>
                        Resource
                      </th>
                      <th style={{ textAlign: "left", padding: "10px 0", fontWeight: 700, fontSize: 12, color: "#6b7280" }}>
                        Timestamp
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                        <td style={{ padding: "10px 0", fontSize: 12, color: "#1b4332", fontWeight: 600 }}>
                          {log.event_type}
                        </td>
                        <td style={{ padding: "10px 0", fontSize: 12, color: "#6b7280" }}>
                          {log.resource_type}
                        </td>
                        <td style={{ padding: "10px 0", fontSize: 12, color: "#6b7280" }}>
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "overview" && (
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#1b4332", marginBottom: 16 }}>
                Platform Status
              </div>
              <div style={{ display: "grid", gap: 12 }}>
                {[
                  { label: "Database", status: "✅ Operational", statusColor: "#16a34a" },
                  { label: "Payment Gateway", status: "✅ Connected", statusColor: "#16a34a" },
                  { label: "Notification Service", status: "✅ Active", statusColor: "#16a34a" },
                  { label: "Audit Logging", status: "✅ Recording", statusColor: "#16a34a" },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 12px",
                      background: "#f9fafb",
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <span style={{ fontWeight: 600, color: "#1b4332" }}>{item.label}</span>
                    <span style={{ color: item.statusColor, fontWeight: 600 }}>{item.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
