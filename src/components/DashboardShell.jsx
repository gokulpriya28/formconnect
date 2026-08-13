import React from "react";
import SettingsPanel from "./SettingsPanel.jsx";

export default function DashboardShell({
  role,
  setRole,
  profileRole,
  profile,
  session,
  user,
  settingsOpen,
  setSettingsOpen,
  openRole,
  handleSignOut,
  getVisibleRoleCards,
  FarmerDashboard,
  BuyerDashboard,
  AdminDashboard,
  supabaseStatus,
}) {
  const visibleRoles = getVisibleRoleCards(profileRole || role || "farmer");

  return (
    <div className="app">
      <style>{css}</style>

      {supabaseStatus.state !== "connected" && (
        <div style={{ background: supabaseStatus.state === "missing-config" ? "#FFF7ED" : "#FEF3C7", color: "#92400E", padding: "10px 28px", fontSize: 13, borderBottom: "1px solid #FCD34D" }}>
          {supabaseStatus.state === "missing-config" ? "Supabase not configured." : "Supabase configured but tables missing. Run supabase-schema.sql."}
        </div>
      )}

      <div className="topbar">
        <div className="topbar-brand">🌱 Agri<span>Lens</span></div>
        <div className="topbar-nav">
          {visibleRoles.map(({ role: roleKey, label, icon }) => (
            <button key={roleKey} className={`nav-btn${role === roleKey ? " active" : ""}`} onClick={() => openRole(roleKey)}>
              {icon} {label}
            </button>
          ))}
          <button className="nav-btn" onClick={() => setRole(null)} style={{ color: "rgba(255,255,255,0.4)" }}>← Home</button>
          {session && user && <span className="nav-btn" style={{ color: "rgba(255,255,255,0.85)", cursor: "default" }}>{user.email}</span>}
          {session && <button className="nav-btn" onClick={() => setSettingsOpen(true)}>⚙ Settings</button>}
          {session && <button className="nav-btn" onClick={handleSignOut}>↪ Sign out</button>}
        </div>
      </div>

      {session && <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} role={role || "farmer"} />}
      {role === "farmer" && <FarmerDashboard profile={profile} />}
      {role === "buyer" && <BuyerDashboard />}
      {role === "admin" && <AdminDashboard role="admin" />}
      {role === "govt" && <AdminDashboard role="govt" />}
    </div>
  );
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Inter', sans-serif;
    background: #FAFAF7;
    color: #1A1A1A;
    min-height: 100vh;
  }
  .app { display: flex; flex-direction: column; min-height: 100vh; }
  .topbar {
    background: #1B4332;
    color: white;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 28px; height: 60px;
    position: sticky; top: 0; z-index: 100;
    box-shadow: 0 2px 12px rgba(0,0,0,0.25);
  }
  .topbar-brand {
    font-family: 'DM Serif Display', serif;
    font-size: 22px; letter-spacing: 0.5px; color: white;
    display: flex; align-items: center; gap: 10px;
  }
  .topbar-brand span { color: #52B788; }
  .topbar-nav { display: flex; gap: 6px; }
  .nav-btn {
    padding: 7px 16px; border-radius: 8px; border: none; cursor: pointer;
    font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 500;
    transition: all 0.15s ease;
    background: transparent; color: rgba(255,255,255,0.7);
  }
  .nav-btn:hover { background: rgba(255,255,255,0.1); color: white; }
  .nav-btn.active { background: #2D6A4F; color: white; }
`;
