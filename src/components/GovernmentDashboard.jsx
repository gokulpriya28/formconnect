import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient.js";
import agriLensServices from "../../services/agriLensServices.js";

// ============================================================================
// GOVERNMENT DASHBOARD — Scheme Management, Eligibility, Application Review
// ============================================================================

export function GovernmentDashboard() {
  const [tab, setTab] = useState("schemes");
  const [schemes, setSchemes] = useState([]);
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState({
    totalSchemes: 0,
    totalApplications: 0,
    approvedApplications: 0,
    totalDisbursal: 0,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadGovernmentData();
  }, []);

  const loadGovernmentData = async () => {
    setLoading(true);

    // Load schemes
    const { data: activeSchemes } = await supabase
      .from("government_schemes")
      .select("*");

    setSchemes(activeSchemes || []);

    // Load applications
    const { data: apps } = await supabase
      .from("scheme_applications")
      .select("*, profiles(full_name, farm_size_acres, district)")
      .order("created_at", { ascending: false });

    setApplications(apps || []);

    // Calculate stats
    const approved = apps?.filter((a) => a.application_status === "approved") || [];
    const totalDisbursal = approved.reduce((sum, a) => sum + (a.benefit_amount || 0), 0);

    setStats({
      totalSchemes: activeSchemes?.length || 0,
      totalApplications: apps?.length || 0,
      approvedApplications: approved.length,
      totalDisbursal,
    });

    setLoading(false);
  };

  const handleCreateScheme = async () => {
    const schemeName = prompt("Enter scheme name:");
    if (!schemeName) return;

    try {
      const result = await agriLensServices.createGovernmentScheme({
        scheme_code: `SCHEME-${Date.now()}`,
        scheme_name: schemeName,
        description: "New government benefit scheme",
        eligibility_criteria: {
          districts: ["Tamil Nadu"],
          min_farm_size: 1,
        },
        benefit_type: "cash_subsidy",
        max_benefit_amount: 10000,
        effective_from: new Date().toISOString().split("T")[0],
        effective_to: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
      });
      alert("Scheme created successfully!");
      loadGovernmentData();
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleReviewApplication = async (applicationId, isApproved) => {
    const benefitAmount = isApproved ? prompt("Enter benefit amount:") : null;
    const rejectionReason = !isApproved ? prompt("Enter rejection reason:") : null;

    try {
      await agriLensServices.reviewSchemeApplication(
        applicationId,
        isApproved,
        isApproved ? parseFloat(benefitAmount) : null,
        rejectionReason
      );
      alert(isApproved ? "Application approved!" : "Application rejected!");
      loadGovernmentData();
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
            🏛️ Government Dashboard
          </div>
          <div style={{ fontSize: 14, color: "#6b7280" }}>
            Manage schemes, review applications, and track farmer benefits
          </div>
        </div>

        {/* KPI Cards */}
        {tab !== "applications" && tab !== "schemes" && (
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
                label: "Active Schemes",
                value: stats.totalSchemes,
                color: "#dcfce7",
                textColor: "#16a34a",
                icon: "📋",
              },
              {
                label: "Total Applications",
                value: stats.totalApplications,
                color: "#dbeafe",
                textColor: "#0284c7",
                icon: "📝",
              },
              {
                label: "Approved",
                value: stats.approvedApplications,
                color: "#fef3c7",
                textColor: "#f59e0b",
                icon: "✅",
              },
              {
                label: "Total Disbursed",
                value: `₹${(stats.totalDisbursal / 100000).toFixed(1)}L`,
                color: "#fce7f3",
                textColor: "#db2777",
                icon: "💵",
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
            { id: "schemes", label: "📋 Schemes" },
            { id: "applications", label: "📝 Applications" },
            { id: "analytics", label: "📊 Analytics" },
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
          {tab === "schemes" && (
            <div>
              <button
                onClick={handleCreateScheme}
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
                + Create New Scheme
              </button>

              <div style={{ display: "grid", gap: 16 }}>
                {schemes.length === 0 ? (
                  <div style={{ textAlign: "center", color: "#6b7280", padding: "32px 0" }}>
                    No schemes created yet
                  </div>
                ) : (
                  schemes.map((scheme) => (
                    <div
                      key={scheme.id}
                      style={{
                        background: "#f9fafb",
                        border: "1px solid #e5e7eb",
                        borderRadius: 12,
                        padding: 16,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "start",
                          marginBottom: 12,
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: "#1b4332" }}>
                            {scheme.scheme_name}
                          </div>
                          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                            Code: {scheme.scheme_code}
                          </div>
                        </div>
                        <div
                          style={{
                            background:
                              scheme.status === "active"
                                ? "#dcfce7"
                                : scheme.status === "inactive"
                                  ? "#fee2e2"
                                  : "#e5e7eb",
                            color:
                              scheme.status === "active"
                                ? "#16a34a"
                                : scheme.status === "inactive"
                                  ? "#dc2626"
                                  : "#6b7280",
                            padding: "6px 12px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          {scheme.status.toUpperCase()}
                        </div>
                      </div>

                      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 12, lineHeight: 1.5 }}>
                        {scheme.description}
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                          gap: 12,
                          marginBottom: 12,
                        }}
                      >
                        <div
                          style={{
                            background: "#dcfce7",
                            padding: "8px 12px",
                            borderRadius: 6,
                            fontSize: 12,
                          }}
                        >
                          <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 600 }}>
                            Max Benefit
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: "#16a34a" }}>
                            ₹{scheme.max_benefit_amount?.toLocaleString()}
                          </div>
                        </div>
                        <div
                          style={{
                            background: "#dbeafe",
                            padding: "8px 12px",
                            borderRadius: 6,
                            fontSize: 12,
                          }}
                        >
                          <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 600 }}>
                            Applicants
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: "#0284c7" }}>
                            {scheme.total_applicants}
                          </div>
                        </div>
                        <div
                          style={{
                            background: "#fef3c7",
                            padding: "8px 12px",
                            borderRadius: 6,
                            fontSize: 12,
                          }}
                        >
                          <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 600 }}>
                            Approved
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: "#f59e0b" }}>
                            {scheme.approved_count}
                          </div>
                        </div>
                      </div>

                      <div style={{ fontSize: 11, color: "#6b7280" }}>
                        Valid: {new Date(scheme.effective_from).toLocaleDateString()} -{" "}
                        {new Date(scheme.effective_to).toLocaleDateString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {tab === "applications" && (
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#1b4332", marginBottom: 16 }}>
                Scheme Applications ({applications.length})
              </div>

              <div style={{ display: "grid", gap: 12 }}>
                {applications.length === 0 ? (
                  <div style={{ textAlign: "center", color: "#6b7280", padding: "32px 0" }}>
                    No applications received yet
                  </div>
                ) : (
                  applications.map((app) => (
                    <div
                      key={app.id}
                      style={{
                        background: "#f9fafb",
                        border:
                          app.application_status === "submitted"
                            ? "2px solid #f59e0b"
                            : "1px solid #e5e7eb",
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
                            {app.profiles?.full_name}
                          </div>
                          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                            Farm: {app.profiles?.farm_size_acres} acres • {app.profiles?.district}
                          </div>
                          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                            Applied: {new Date(app.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div
                          style={{
                            background:
                              app.application_status === "submitted"
                                ? "#fef3c7"
                                : app.application_status === "approved"
                                  ? "#dcfce7"
                                  : "#fee2e2",
                            color:
                              app.application_status === "submitted"
                                ? "#d97706"
                                : app.application_status === "approved"
                                  ? "#16a34a"
                                  : "#dc2626",
                            padding: "6px 12px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          {app.application_status.toUpperCase()}
                        </div>
                      </div>

                      {app.application_status === "submitted" && (
                        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                          <button
                            onClick={() => handleReviewApplication(app.id, true)}
                            style={{
                              background: "#16a34a",
                              color: "white",
                              border: "none",
                              padding: "6px 12px",
                              borderRadius: 6,
                              fontWeight: 600,
                              cursor: "pointer",
                              fontSize: 12,
                            }}
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReviewApplication(app.id, false)}
                            style={{
                              background: "#ef4444",
                              color: "white",
                              border: "none",
                              padding: "6px 12px",
                              borderRadius: 6,
                              fontWeight: 600,
                              cursor: "pointer",
                              fontSize: 12,
                            }}
                          >
                            Reject
                          </button>
                        </div>
                      )}

                      {app.application_status === "approved" && app.benefit_amount && (
                        <div
                          style={{
                            background: "#dcfce7",
                            color: "#16a34a",
                            padding: "8px 12px",
                            borderRadius: 6,
                            fontSize: 12,
                            marginTop: 10,
                            fontWeight: 600,
                          }}
                        >
                          ✅ Approved for ₹{app.benefit_amount.toLocaleString()}
                          {app.disbursed_at
                            ? ` (Disbursed on ${new Date(app.disbursed_at).toLocaleDateString()})`
                            : " (Pending disbursement)"}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {tab === "analytics" && (
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#1b4332", marginBottom: 16 }}>
                Government Benefits Analytics
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16 }}>
                <div
                  style={{
                    background: "#f9fafb",
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    padding: 14,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 8 }}>
                    Application Status Distribution
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {[
                      {
                        label: "Submitted",
                        count: applications.filter((a) => a.application_status === "submitted").length,
                        color: "#f59e0b",
                      },
                      {
                        label: "Approved",
                        count: applications.filter((a) => a.application_status === "approved").length,
                        color: "#16a34a",
                      },
                      {
                        label: "Rejected",
                        count: applications.filter((a) => a.application_status === "rejected").length,
                        color: "#ef4444",
                      },
                    ].map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "8px 0",
                          borderBottom: "1px solid #e5e7eb",
                        }}
                      >
                        <span style={{ fontSize: 12, color: "#6b7280" }}>
                          <span style={{ display: "inline-block", width: 12, height: 12, background: item.color, borderRadius: "50%", marginRight: 8 }} />
                          {item.label}
                        </span>
                        <span style={{ fontWeight: 700, color: "#1b4332" }}>
                          {item.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    background: "#f9fafb",
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    padding: 14,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 8 }}>
                    Average Benefit Amount
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#16a34a", marginBottom: 8 }}>
                    ₹
                    {(
                      stats.totalDisbursal /
                      Math.max(stats.approvedApplications, 1)
                    ).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    Per approved farmer
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GovernmentDashboard;
