import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../supabaseClient.js";

const STORAGE_KEY = "agriLens_settings_v1";

const defaultSettings = {
  profile: { name: "Raman Patel", email: "raman@agrilens.in", phone: "+91 98765 43210", role: "Farmer" },
  notifications: {
    diseaseAlerts: true,
    weatherAlerts: true,
    marketPriceAlerts: true,
    governmentAlerts: true,
    orderUpdates: true,
    paymentUpdates: true,
    cropReminders: true,
    promotionalNotifications: false,
  },
  appearance: { theme: "system", mode: "farmer", fontSize: "medium" },
  language: "ta",
  currency: "INR",
  dateFormat: "DD/MM/YYYY",
  privacy: {
    cameraPermission: false,
    locationPermission: true,
    notificationPermission: true,
    dataDownload: true,
  },
  offline: {
    wifiOnlyDownloads: true,
    mobileDataUsage: "balanced",
    syncStatus: "Synced 8 mins ago",
  },
};

const toggleItems = [
  { key: "diseaseAlerts", label: "Disease alerts" },
  { key: "weatherAlerts", label: "Weather alerts" },
  { key: "marketPriceAlerts", label: "Market price alerts" },
  { key: "governmentAlerts", label: "Government scheme alerts" },
  { key: "orderUpdates", label: "Order updates" },
  { key: "paymentUpdates", label: "Payment updates" },
  { key: "cropReminders", label: "Crop reminders" },
  { key: "promotionalNotifications", label: "Promotional notifications" },
];

const languageOptions = [
  { value: "en", label: "English" },
  { value: "ta", label: "Tamil" },
  { value: "hi", label: "Hindi" },
  { value: "te", label: "Telugu" },
  { value: "kn", label: "Kannada" },
  { value: "ml", label: "Malayalam" },
];

const themeOptions = [
  { value: "light", label: "Light mode" },
  { value: "dark", label: "Dark mode" },
  { value: "system", label: "System default" },
];

const fontOptions = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
];

const modeOptions = [
  { value: "farmer", label: "Farmer Mode" },
  { value: "expert", label: "Expert Mode" },
];

const roleSpecificSections = {
  farmer: [
    { key: "farm", title: "Farm Profile", body: "Manage land, irrigation, crop calendar, and soil health details." },
    { key: "ai", title: "AI Agriculture Preferences", body: "Tune crop health thresholds, disease detection, and risk alerts." },
    { key: "benefits", title: "Government Benefits", body: "Track subsidy eligibility and scheme application reminders." },
  ],
  buyer: [
    { key: "business", title: "Business Profile", body: "Manage procurement preferences, GST details, and supplier tracking." },
    { key: "delivery", title: "Delivery Preferences", body: "Save pickup and delivery points and repeat order defaults." },
    { key: "payment", title: "Payment Settings", body: "Manage UPI, invoices, and settlement preferences for orders." },
  ],
  admin: [
    { key: "platform", title: "Platform Governance", body: "Configure compliance, oversight rules, and platform-level controls." },
    { key: "rbac", title: "RBAC & Permissions", body: "Review access restrictions and privileged workflows." },
    { key: "audit", title: "Audit & Security", body: "Track role changes, system events, and suspicious activity." },
  ],
  govt: [
    { key: "department", title: "Department Profile", body: "Configure office metadata, officer roles, and reporting lines." },
    { key: "scheme", title: "Scheme Monitoring", body: "Create and review agricultural benefit scheme rules and impact." },
    { key: "eligibility", title: "Eligibility Rules", body: "Manage district-specific and crop-specific rule engines." },
  ],
};

const panelStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(17, 24, 39, 0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  padding: 20,
};

const cardStyle = {
  width: "min(980px, 100%)",
  maxHeight: "88vh",
  overflowY: "auto",
  background: "#ffffff",
  borderRadius: 24,
  boxShadow: "0 24px 60px rgba(15, 23, 42, 0.2)",
  border: "1px solid #e5e7eb",
};

function readStoredSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSettings;
    const parsed = JSON.parse(raw);
    return {
      ...defaultSettings,
      ...parsed,
      profile: { ...defaultSettings.profile, ...(parsed.profile || {}) },
      notifications: { ...defaultSettings.notifications, ...(parsed.notifications || {}) },
      appearance: { ...defaultSettings.appearance, ...(parsed.appearance || {}) },
      privacy: { ...defaultSettings.privacy, ...(parsed.privacy || {}) },
      offline: { ...defaultSettings.offline, ...(parsed.offline || {}) },
    };
  } catch {
    return defaultSettings;
  }
}

export default function SettingsPanel({ open, onClose, role = "farmer" }) {
  const [settings, setSettings] = useState(readStoredSettings);
  const [saved, setSaved] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(false);

  useEffect(() => {
    if (!open) return;

    const loadFromSupabase = async () => {
      if (!supabase) {
        setSettings(readStoredSettings());
        return;
      }

      try {
        setLoadingSettings(true);
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          setSettings(readStoredSettings());
          return;
        }

        const { data, error } = await supabase.from("profiles").select("settings").eq("id", user.id).maybeSingle();
        if (error) {
          setSettings(readStoredSettings());
          return;
        }

        const next = data?.settings && typeof data.settings === "object" ? data.settings : {};
        const merged = {
          ...defaultSettings,
          ...next,
          profile: { ...defaultSettings.profile, ...(next.profile || {}) },
          notifications: { ...defaultSettings.notifications, ...(next.notifications || {}) },
          appearance: { ...defaultSettings.appearance, ...(next.appearance || {}) },
          privacy: { ...defaultSettings.privacy, ...(next.privacy || {}) },
          offline: { ...defaultSettings.offline, ...(next.offline || {}) },
        };

        setSettings(merged);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      } catch {
        setSettings(readStoredSettings());
      } finally {
        setLoadingSettings(false);
      }
    };

    loadFromSupabase();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings, open]);

  const summary = useMemo(() => {
    const enabled = Object.values(settings.notifications || {}).filter(Boolean).length;
    return `${enabled} alerts active`;
  }, [settings.notifications]);

  const updateProfile = (field, value) => {
    setSaved(false);
    setSettings(prev => ({ ...prev, profile: { ...prev.profile, [field]: value } }));
  };

  const updateNotification = (key, value) => {
    setSaved(false);
    setSettings(prev => ({ ...prev, notifications: { ...prev.notifications, [key]: value } }));
  };

  const updateAppearance = (field, value) => {
    setSaved(false);
    setSettings(prev => ({ ...prev, appearance: { ...prev.appearance, [field]: value } }));
  };

  const updatePrivacy = (key, value) => {
    setSaved(false);
    setSettings(prev => ({ ...prev, privacy: { ...prev.privacy, [key]: value } }));
  };

  const saveSettings = async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));

    if (supabase) {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (!userError && user) {
          const { error } = await supabase.from("profiles").update({ settings, updated_at: new Date().toISOString() }).eq("id", user.id);
          if (error) console.error("Supabase settings save failed:", error);
        }
      } catch (error) {
        console.error("Settings sync failed:", error);
      }
    }

    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  if (!open) return null;

  return (
    <div style={panelStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={cardStyle}>
        <div style={{ position: "sticky", top: 0, background: "#ffffff", zIndex: 1, borderBottom: "1px solid #e5e7eb", padding: "20px 24px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.1, color: "#6b7280", fontWeight: 700 }}>AgriLens Settings</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#1b4332" }}>Settings</div>
            </div>
            <button type="button" onClick={onClose} style={{ border: "1px solid #d1d5db", borderRadius: 10, background: "#f9fafb", padding: "8px 12px", cursor: "pointer", fontWeight: 700 }}>Close</button>
          </div>
        </div>

        <div style={{ padding: 24 }}>
          <div style={{ display: "grid", gap: 18 }}>
            <section style={{ border: "1px solid #edf2f7", borderRadius: 18, padding: 18, background: "#f8fafc" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#1b4332", marginBottom: 12 }}>Account</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
                <Field label="Name"><input value={settings.profile.name} onChange={(e) => updateProfile("name", e.target.value)} style={inputStyle} /></Field>
                <Field label="Email"><input value={settings.profile.email} onChange={(e) => updateProfile("email", e.target.value)} style={inputStyle} /></Field>
                <Field label="Phone number"><input value={settings.profile.phone} onChange={(e) => updateProfile("phone", e.target.value)} style={inputStyle} /></Field>
                <Field label="Role"><input value={settings.profile.role} disabled style={{ ...inputStyle, background: "#f3f4f6", color: "#4b5563" }} /></Field>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
                <button type="button" style={primaryButton}>Change password</button>
                <button type="button" style={secondaryButton}>Logout</button>
                <button type="button" style={dangerButton}>Delete account</button>
              </div>
            </section>

            <section style={{ border: "1px solid #edf2f7", borderRadius: 18, padding: 18, background: "#f8fafc" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#1b4332" }}>Notifications</div>
                <div style={{ fontSize: 12, color: "#374151", fontWeight: 600 }}>{summary}</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                {toggleItems.map(item => (
                  <ToggleRow key={item.key} label={item.label} value={settings.notifications[item.key]} onChange={(value) => updateNotification(item.key, value)} />
                ))}
              </div>
            </section>

            <section style={{ border: "1px solid #edf2f7", borderRadius: 18, padding: 18, background: "#f8fafc" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#1b4332", marginBottom: 12 }}>Appearance & Language</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
                <Field label="Language"><select value={settings.language} onChange={(e) => setSettings(prev => ({ ...prev, language: e.target.value }))} style={inputStyle}>{languageOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
                <Field label="Theme"><select value={settings.appearance.theme} onChange={(e) => updateAppearance("theme", e.target.value)} style={inputStyle}>{themeOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
                <Field label="Font size"><select value={settings.appearance.fontSize} onChange={(e) => updateAppearance("fontSize", e.target.value)} style={inputStyle}>{fontOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
                <Field label="Mode"><select value={settings.appearance.mode} onChange={(e) => updateAppearance("mode", e.target.value)} style={inputStyle}>{modeOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
              </div>
            </section>

            {roleSpecificSections[role] && roleSpecificSections[role].length > 0 && (
              <section style={{ border: "1px solid #edf2f7", borderRadius: 18, padding: 18, background: "#f8fafc" }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#1b4332", marginBottom: 12 }}>Role-specific settings</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                  {roleSpecificSections[role].map(item => (
                    <div key={item.key} style={{ border: "1px solid #dfe7ec", borderRadius: 12, background: "#fff", padding: 14 }}>
                      <div style={{ fontWeight: 700, color: "#1b4332", marginBottom: 6 }}>{item.title}</div>
                      <div style={{ fontSize: 13, color: "#4b5563", lineHeight: 1.5 }}>{item.body}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section style={{ border: "1px solid #edf2f7", borderRadius: 18, padding: 18, background: "#f8fafc" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#1b4332", marginBottom: 12 }}>Privacy & Security</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                <ToggleRow label="Camera permission" value={settings.privacy.cameraPermission} onChange={(value) => updatePrivacy("cameraPermission", value)} />
                <ToggleRow label="Location permission" value={settings.privacy.locationPermission} onChange={(value) => updatePrivacy("locationPermission", value)} />
                <ToggleRow label="Notification permission" value={settings.privacy.notificationPermission} onChange={(value) => updatePrivacy("notificationPermission", value)} />
                <ToggleRow label="Data download" value={settings.privacy.dataDownload} onChange={(value) => updatePrivacy("dataDownload", value)} />
              </div>
            </section>

            <section style={{ border: "1px solid #edf2f7", borderRadius: 18, padding: 18, background: "#f8fafc" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#1b4332", marginBottom: 12 }}>Data & Offline</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
                <ToggleRow label="Wi‑Fi only downloads" value={settings.offline.wifiOnlyDownloads} onChange={(value) => setSettings(prev => ({ ...prev, offline: { ...prev.offline, wifiOnlyDownloads: value } }))} />
                <Field label="Mobile data usage"><select value={settings.offline.mobileDataUsage} onChange={(e) => setSettings(prev => ({ ...prev, offline: { ...prev.offline, mobileDataUsage: e.target.value } }))} style={inputStyle}><option value="balanced">Balanced</option><option value="limited">Limited</option><option value="unrestricted">Unrestricted</option></select></Field>
                <Field label="Sync status"><input value={settings.offline.syncStatus} onChange={(e) => setSettings(prev => ({ ...prev, offline: { ...prev.offline, syncStatus: e.target.value } }))} style={inputStyle} /></Field>
              </div>
            </section>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
            <div style={{ fontSize: 13, color: "#4b5563" }}>
              {saved ? "✓ Settings saved locally and synced to your profile if Supabase is connected." : loadingSettings ? "Loading your saved settings..." : "Changes are stored locally and synced to your profile when Supabase is available."}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" style={secondaryButton} onClick={onClose}>Cancel</button>
              <button type="button" style={primaryButton} onClick={saveSettings}>Save settings</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13, color: "#374151", fontWeight: 600 }}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function ToggleRow({ label, value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderRadius: 12, background: "#ffffff", border: "1px solid #e5e7eb" }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: "#1f2937" }}>{label}</span>
      <button type="button" onClick={() => onChange(!value)} style={{ width: 50, height: 28, borderRadius: 999, border: "none", background: value ? "#2d6a4f" : "#d1d5db", position: "relative", cursor: "pointer", transition: "all 0.2s ease" }}>
        <span style={{ width: 20, height: 20, borderRadius: "50%", position: "absolute", background: "#fff", top: 4, left: value ? 26 : 4, transition: "all 0.2s ease", boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }} />
      </button>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  border: "1px solid #d1d5db",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 14,
  background: "#ffffff",
  color: "#111827",
  outline: "none",
};
const primaryButton = { background: "#1b4332", color: "#ffffff", border: "none", borderRadius: 10, padding: "10px 16px", fontWeight: 700, cursor: "pointer" };
const secondaryButton = { background: "#ffffff", color: "#1f2937", border: "1px solid #d1d5db", borderRadius: 10, padding: "10px 16px", fontWeight: 700, cursor: "pointer" };
const dangerButton = { background: "#dc2626", color: "#ffffff", border: "none", borderRadius: 10, padding: "10px 16px", fontWeight: 700, cursor: "pointer" };
