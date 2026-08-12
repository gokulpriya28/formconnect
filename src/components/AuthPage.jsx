import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient.js";
import {
  validateEmail,
  validatePassword,
  passwordStrength,
} from "../../src/security/sanitize.js";
import { rateLimiters, formatRetryTime } from "../../src/security/rateLimiter.js";
import { logEvent, logLoginFailed, LOG_EVENTS } from "../../src/security/logger.js";

// ─── DESIGN TOKENS ───────────────────────────────────────────────
const G = {
  soil: "#1B4332",
  leaf: "#2D6A4F",
  sprout: "#40916C",
  field: "#52B788",
  mist: "#D8F3DC",
  amber: "#E76F00",
  clay: "#6B3F00",
  sky: "#EEF4FF",
  ink: "#1A1A1A",
  stone: "#6B7280",
  cream: "#FAFAF7",
  white: "#FFFFFF",
  border: "#E5E7EB",
  red: "#DC2626",
};

const authPageCss = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  .auth-page {
    min-height: 100vh;
    background: linear-gradient(135deg, #0F2027 0%, #203A43 50%, #2C5364 100%);
    display: flex;
    flex-direction: column;
    font-family: 'Inter', sans-serif;
  }

  /* ── Header ── */
  .auth-header {
    background: rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(10px);
    padding: 20px 40px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .auth-brand {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 24px;
    font-weight: 700;
    color: white;
    font-family: 'DM Serif Display', serif;
    letter-spacing: 0.5px;
  }

  .auth-brand span {
    color: #52B788;
    font-style: italic;
  }

  .auth-tagline {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
    letter-spacing: 0.8px;
    text-transform: uppercase;
  }

  /* ── Main Container ── */
  .auth-container {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
  }

  .auth-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 60px;
    max-width: 1000px;
    width: 100%;
  }

  @media (max-width: 900px) {
    .auth-grid {
      grid-template-columns: 1fr;
      gap: 40px;
    }
    .auth-left {
      display: none;
    }
  }

  /* ── Left Side (Marketing) ── */
  .auth-left {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 32px;
  }

  .auth-hero {
    color: white;
  }

  .auth-hero h1 {
    font-family: 'DM Serif Display', serif;
    font-size: 48px;
    line-height: 1.2;
    margin-bottom: 16px;
    letter-spacing: -0.5px;
  }

  .auth-hero h1 em {
    color: #52B788;
    font-style: italic;
  }

  .auth-hero p {
    font-size: 16px;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.8);
    margin-bottom: 12px;
  }

  /* ── Feature Pills ── */
  .auth-features {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .auth-feature {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px;
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
    border-radius: 12px;
    border: 1px solid rgba(82, 183, 136, 0.2);
    transition: all 0.2s ease;
  }

  .auth-feature:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(82, 183, 136, 0.4);
  }

  .auth-feature-icon {
    font-size: 20px;
    min-width: 24px;
  }

  .auth-feature-text {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.9);
    font-weight: 500;
  }

  /* ── Right Side (Form) ── */
  .auth-right {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .auth-form-container {
    background: white;
    border-radius: 20px;
    padding: 40px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    animation: slideInUp 0.4s ease;
  }

  @keyframes slideInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .auth-form-title {
    font-size: 24px;
    font-weight: 700;
    color: ${G.soil};
    margin-bottom: 8px;
    font-family: 'DM Serif Display', serif;
  }

  .auth-form-subtitle {
    font-size: 13px;
    color: ${G.stone};
    margin-bottom: 24px;
  }

  .auth-tabs {
    display: flex;
    gap: 8px;
    margin-bottom: 20px;
    background: ${G.mist};
    border-radius: 12px;
    padding: 4px;
  }

  .auth-tab {
    flex: 1;
    padding: 10px 16px;
    border: none;
    background: transparent;
    color: ${G.stone};
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    border-radius: 10px;
    transition: all 0.2s ease;
    text-align: center;
  }

  .auth-tab.active {
    background: white;
    color: ${G.soil};
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  .auth-form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 14px;
  }

  .auth-form-label {
    font-size: 12px;
    font-weight: 600;
    color: ${G.ink};
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .auth-form-label-required {
    color: ${G.red};
    font-size: 14px;
  }

  .auth-form-input,
  .auth-form-select {
    padding: 12px 14px;
    border: 1.5px solid ${G.border};
    border-radius: 12px;
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    color: ${G.ink};
    background: white;
    outline: none;
    transition: all 0.2s ease;
  }

  .auth-form-input:focus,
  .auth-form-select:focus {
    border-color: ${G.field};
    box-shadow: 0 0 0 3px rgba(82, 183, 136, 0.15);
  }

  .auth-form-input.error {
    border-color: ${G.red};
  }

  .auth-form-input.error:focus {
    box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.15);
  }

  .auth-form-error {
    font-size: 11px;
    color: ${G.red};
    font-weight: 500;
  }

  .auth-form-hint {
    font-size: 11px;
    color: ${G.stone};
    font-weight: 400;
  }

  /* ── Password Strength ── */
  .auth-pw-strength {
    margin-top: 6px;
  }

  .auth-pw-bar {
    display: flex;
    gap: 3px;
    margin-bottom: 6px;
  }

  .auth-pw-seg {
    height: 4px;
    flex: 1;
    border-radius: 2px;
    background: ${G.border};
    transition: background 0.2s;
  }

  .auth-pw-seg.s0 { background: ${G.red}; }
  .auth-pw-seg.s1 { background: ${G.amber}; }
  .auth-pw-seg.s2 { background: #EAB308; }
  .auth-pw-seg.s3 { background: ${G.field}; }
  .auth-pw-seg.s4 { background: ${G.leaf}; }

  .auth-pw-label {
    font-size: 10px;
    font-weight: 600;
  }

  .auth-pw-label.s0, .auth-pw-label.s1 { color: ${G.red}; }
  .auth-pw-label.s2 { color: ${G.amber}; }
  .auth-pw-label.s3, .auth-pw-label.s4 { color: ${G.leaf}; }

  /* ── Checkbox ── */
  .auth-checkbox-group {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 14px;
    padding: 12px;
    background: ${G.mist};
    border-radius: 10px;
  }

  .auth-checkbox-input {
    width: 18px;
    height: 18px;
    margin-top: 2px;
    cursor: pointer;
    accent-color: ${G.field};
  }

  .auth-checkbox-label {
    font-size: 12px;
    color: ${G.stone};
    line-height: 1.4;
    cursor: pointer;
  }

  .auth-checkbox-label a {
    color: ${G.field};
    text-decoration: none;
    font-weight: 600;
  }

  .auth-checkbox-label a:hover {
    text-decoration: underline;
  }

  /* ── Buttons ── */
  .auth-btn {
    padding: 12px 16px;
    border: none;
    border-radius: 12px;
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 44px;
  }

  .auth-btn-primary {
    background: ${G.soil};
    color: white;
    width: 100%;
  }

  .auth-btn-primary:hover:not(:disabled) {
    background: ${G.leaf};
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(27, 67, 50, 0.3);
  }

  .auth-btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  .auth-btn-text {
    background: none;
    color: ${G.field};
    padding: 0;
    font-size: 13px;
  }

  .auth-btn-text:hover {
    color: ${G.leaf};
  }

  /* ── Alerts ── */
  .auth-alert {
    padding: 12px 14px;
    border-radius: 12px;
    font-size: 13px;
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin-bottom: 16px;
    animation: slideInDown 0.3s ease;
  }

  @keyframes slideInDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .auth-alert-error {
    background: #FEE2E2;
    color: #991B1B;
    border: 1px solid #FECACA;
  }

  .auth-alert-success {
    background: #D1FAE5;
    color: #065F46;
    border: 1px solid #A7F3D0;
  }

  .auth-alert-info {
    background: #DBEAFE;
    color: #1D4ED8;
    border: 1px solid #BFDBFE;
  }

  .auth-alert-warning {
    background: #FEF3C7;
    color: #92400E;
    border: 1px solid #FCD34D;
  }

  /* ── Divider ── */
  .auth-divider {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 16px 0;
    color: ${G.stone};
    font-size: 12px;
  }

  .auth-divider-line {
    flex: 1;
    height: 1px;
    background: ${G.border};
  }

  /* ── Footer ── */
  .auth-footer {
    text-align: center;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
    padding-top: 20px;
  }

  .auth-footer a {
    color: #52B788;
    text-decoration: none;
    font-weight: 600;
  }

  .auth-footer a:hover {
    text-decoration: underline;
  }
`;

function PasswordStrengthBar({ password }) {
  const score = passwordStrength(password);
  const labels = ["", "Weak", "Fair", "Good", "Strong", "Very Strong"];
  return password.length > 0 ? (
    <div className="auth-pw-strength">
      <div className="auth-pw-bar">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className={`auth-pw-seg s${i <= score ? score : 5}`} />
        ))}
      </div>
      <div className={`auth-pw-label s${score}`}>{labels[score]}</div>
    </div>
  ) : null;
}

export default function AuthPage({
  onAuthSuccess,
  onRoleSelect,
  session,
  user,
  profileRole,
}) {
  const [authMode, setAuthMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [district, setDistrict] = useState("Tamil Nadu");
  const [village, setVillage] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [signupRole, setSignupRole] = useState("buyer");
  const [signupType, setSignupType] = useState("hotel");
  const [emailError, setEmailError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [pwErrors, setPwErrors] = useState([]);
  const [authMessage, setAuthMessage] = useState("");
  const [authMessageType, setAuthMessageType] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [rateLimitCooldown, setRateLimitCooldown] = useState(0);
  const [showForgotPw, setShowForgotPw] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotStatus, setForgotStatus] = useState("");

  // Rate limit countdown
  useEffect(() => {
    if (rateLimitCooldown <= 0) return;
    const timer = setInterval(
      () => setRateLimitCooldown((prev) => Math.max(0, prev - 1)),
      1000
    );
    return () => clearInterval(timer);
  }, [rateLimitCooldown]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("farmconnect_remember_email");
      if (saved) {
        setEmail(saved);
        setRememberMe(true);
      }
    } catch (error) {
      // browsers without localStorage support will continue normally
    }
  }, []);

  useEffect(() => {
    if (signupRole === "farmer") {
      setSignupType((prev) => (prev === "hotel" || prev === "restaurant" || prev === "corporate" || prev === "retailer" ? "grower" : prev));
    } else {
      setSignupType((prev) => (prev === "grower" || prev === "organic" || prev === "poultry" || prev === "dairy" ? "hotel" : prev));
      setPanNumber("");
    }
  }, [signupRole]);

  const handleAuthSubmit = async (event) => {
    event.preventDefault();

    if (!validateEmail(email)) {
      setEmailError("Enter a valid email address.");
      return;
    }
    setEmailError("");

    if (authMode === "signup") {
      if (!fullName.trim()) {
        setAuthMessage("Please enter your full name.");
        setAuthMessageType("error");
        return;
      }
      if (!district.trim()) {
        setAuthMessage("Please enter your district.");
        setAuthMessageType("error");
        return;
      }
      if (signupRole === "farmer") {
        const pan = panNumber.trim().toUpperCase();
        if (!pan) {
          setAuthMessage("Please enter your PAN number for farmer verification.");
          setAuthMessageType("error");
          return;
        }
        if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
          setAuthMessage("PAN number must be a valid 10-character format like ABCDE1234F.");
          setAuthMessageType("error");
          return;
        }
      }
      if (!village.trim()) {
        setAuthMessage("Please enter your village or locality.");
        setAuthMessageType("error");
        return;
      }
      if (!signupType) {
        setAuthMessage("Please select your account subtype.");
        setAuthMessageType("error");
        return;
      }
      if (!confirmPassword) {
        setConfirmError("Please confirm your password.");
        return;
      }
      if (password !== confirmPassword) {
        setConfirmError("Passwords do not match.");
        return;
      }
      const { valid, errors } = validatePassword(password);
      if (!valid) {
        setPwErrors(errors);
        return;
      }
      if (!agreedToTerms) {
        setAuthMessage("Please agree to Terms of Service and Privacy Policy.");
        setAuthMessageType("error");
        return;
      }
      setConfirmError("");
      setPwErrors([]);
    }

    if (!password) {
      setAuthMessage("Please enter your password.");
      setAuthMessageType("warning");
      return;
    }

    if (authMode === "signin") {
      try {
        if (rememberMe) {
          localStorage.setItem("farmconnect_remember_email", email.trim().toLowerCase());
        } else {
          localStorage.removeItem("farmconnect_remember_email");
        }
      } catch (error) {
        // ignore storage errors
      }
    }

    const rl = rateLimiters.login();
    if (!rl.allowed) {
      const secs = Math.ceil(rl.retryAfterMs / 1000);
      setRateLimitCooldown(secs);
      setAuthMessage(
        `Too many attempts. Try again in ${formatRetryTime(rl.retryAfterMs)}.`
      );
      setAuthMessageType("error");
      return;
    }

    setAuthLoading(true);
    setAuthMessage("");
    setPwErrors([]);

    try {
      if (authMode === "signup") {
        const normalizedRole = signupRole === "farmer" ? "Farmer" : "Buyer";
        const profileType = signupRole === "farmer"
          ? {
              grower: "Grower",
              organic: "Organic Farmer",
              poultry: "Poultry Farmer",
              dairy: "Dairy Farmer",
            }[signupType] || "Grower"
          : {
              hotel: "Hotel Buyer",
              restaurant: "Restaurant Buyer",
              corporate: "Corporate Buyer",
              retailer: "Retailer",
            }[signupType] || "Hotel Buyer";

        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: {
              signup_role: signupRole,
              signup_type: signupType,
              profile_type: profileType,
              full_name: fullName.trim(),
              phone: phone.trim(),
              district,
              village: village.trim(),
              pan_number: signupRole === "farmer" ? panNumber.trim().toUpperCase() : null,
            },
          },
        });
        if (error) throw error;
        await logEvent(LOG_EVENTS.SIGNUP, { role: signupRole }, data?.user?.id);

        if (data?.user?.id) {
          await supabase.from("profiles").upsert({
            id: data.user.id,
            email: email.trim().toLowerCase(),
            full_name: fullName.trim(),
            role: normalizedRole,
            profile_type: profileType,
            phone: phone.trim(),
            district,
            village: village.trim(),
            pan_number: signupRole === "farmer" ? panNumber.trim().toUpperCase() : null,
            created_at: new Date().toISOString(),
          }, { onConflict: "id" });
        }

        setAuthMessage(
          "Account created! Check your email to confirm before signing in."
        );
        setAuthMessageType("success");
        setTimeout(() => {
          setAuthMode("signin");
          setPassword("");
          setConfirmPassword("");
          setPanNumber("");
          setAgreedToTerms(false);
        }, 2000);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (error) {
          await logLoginFailed(email);
          throw error;
        }
        await logEvent(LOG_EVENTS.LOGIN_SUCCESS, {}, data.user?.id);
        setAuthMessage("Signed in successfully!");
        setAuthMessageType("success");
        if (onAuthSuccess) {
          setTimeout(onAuthSuccess, 500);
        }
      }
    } catch (error) {
      setAuthMessage(error?.message || "Authentication failed.");
      setAuthMessageType("error");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!validateEmail(forgotEmail)) {
      setForgotStatus("Enter a valid email address.");
      return;
    }

    const rl = rateLimiters.otp();
    if (!rl.allowed) {
      setForgotStatus(
        `Too many requests. Try again in ${formatRetryTime(rl.retryAfterMs)}.`
      );
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(
      forgotEmail.trim().toLowerCase(),
      {
        redirectTo: window.location.origin,
      }
    );
    await logEvent(LOG_EVENTS.PASSWORD_RESET, {
      email_domain: forgotEmail.split("@")[1],
    });
    setForgotStatus(
      error ? error.message : "Password reset email sent! Check your inbox."
    );
  };

  return (
    <div className="auth-page">
      <style>{authPageCss}</style>

      <div className="auth-header">
        <div className="auth-brand">
          🌱 Farm<span>Connect</span>
        </div>
        <div className="auth-tagline">India's Transparent Farm-to-Buyer Marketplace</div>
      </div>

      <div className="auth-container">
        <div className="auth-grid">
          {/* Left Side - Marketing */}
          <div className="auth-left">
            <div className="auth-hero">
              <h1>
                From Soil to <em>Sale</em>
              </h1>
              <p>Direct connection. No middlemen. Complete transparency.</p>
            </div>

            <div className="auth-features">
              <div className="auth-feature">
                <div className="auth-feature-icon">🔒</div>
                <div className="auth-feature-text">
                  <strong>Secure</strong> — Supabase Auth with bcrypt hashing
                </div>
              </div>
              <div className="auth-feature">
                <div className="auth-feature-icon">⚡</div>
                <div className="auth-feature-text">
                  <strong>Fast</strong> — Real-time sync across all devices
                </div>
              </div>
              <div className="auth-feature">
                <div className="auth-feature-icon">📊</div>
                <div className="auth-feature-text">
                  <strong>Transparent</strong> — Track every transaction end-to-end
                </div>
              </div>
              <div className="auth-feature">
                <div className="auth-feature-icon">🌍</div>
                <div className="auth-feature-text">
                  <strong>Verified</strong> — All farmers & buyers KYC verified
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Form */}
          <div className="auth-right">
            <div className="auth-form-container">
              <div className="auth-form-title">
                {authMode === "signin" ? "Welcome Back" : "Join FarmConnect"}
              </div>
              <div className="auth-form-subtitle">
                {authMode === "signin"
                  ? "Sign in to your account"
                  : "Create a new account to get started"}
              </div>

              {authMessage && (
                <div className={`auth-alert auth-alert-${authMessageType}`}>
                  <span>
                    {authMessageType === "error"
                      ? "❌"
                      : authMessageType === "success"
                      ? "✅"
                      : "ℹ"}
                  </span>
                  <span>{authMessage}</span>
                </div>
              )}

              {rateLimitCooldown > 0 && (
                <div className="auth-alert auth-alert-error">
                  <span>🔒</span>
                  <span>
                    Too many attempts. Try again in {rateLimitCooldown}s
                  </span>
                </div>
              )}

              <div className="auth-tabs">
                <button
                  type="button"
                  className={`auth-tab${authMode === "signin" ? " active" : ""}`}
                  onClick={() => {
                    setAuthMode("signin");
                    setPwErrors([]);
                    setAuthMessage("");
                  }}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  className={`auth-tab${authMode === "signup" ? " active" : ""}`}
                  onClick={() => {
                    setAuthMode("signup");
                    setPwErrors([]);
                    setAuthMessage("");
                  }}
                >
                  Sign Up
                </button>
              </div>

              <form onSubmit={handleAuthSubmit} autoComplete="on" noValidate>
                <div className="auth-form-group">
                  <label className="auth-form-label" htmlFor="auth-email">
                    Email Address
                    <span className="auth-form-label-required">*</span>
                  </label>
                  <input
                    id="auth-email"
                    className={`auth-form-input${emailError ? " error" : ""}`}
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailError("");
                    }}
                    placeholder="your@email.com"
                    autoComplete="email"
                    required
                  />
                  {emailError && (
                    <div className="auth-form-error">{emailError}</div>
                  )}
                </div>

                {authMode === "signup" && (
                  <>
                    <div className="auth-form-group">
                      <label className="auth-form-label" htmlFor="auth-fullname">
                        Full Name
                        <span className="auth-form-label-required">*</span>
                      </label>
                      <input
                        id="auth-fullname"
                        className="auth-form-input"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Raman Kumar"
                        autoComplete="name"
                        required
                      />
                    </div>

                    <div className="auth-form-group">
                      <label className="auth-form-label" htmlFor="auth-phone">
                        Phone Number
                      </label>
                      <input
                        id="auth-phone"
                        className="auth-form-input"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        autoComplete="tel"
                      />
                      <div className="auth-form-hint">
                        Optional, but helps buyers and support contact you faster.
                      </div>
                    </div>

                    {signupRole === "farmer" && (
                      <div className="auth-form-group">
                        <label className="auth-form-label" htmlFor="auth-pan-number">
                          PAN Number
                          <span className="auth-form-label-required">*</span>
                        </label>
                        <input
                          id="auth-pan-number"
                          className="auth-form-input"
                          type="text"
                          value={panNumber}
                          onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                          placeholder="ABCDE1234F"
                          autoComplete="off"
                          maxLength={10}
                          required
                        />
                        <div className="auth-form-hint">
                          Required for farmers. Used only for identity verification on FarmConnect.
                        </div>
                      </div>
                    )}

                    <div className="auth-form-row">
                      <div className="auth-form-group" style={{ flex: 1 }}>
                        <label className="auth-form-label" htmlFor="auth-district">
                          District
                          <span className="auth-form-label-required">*</span>
                        </label>
                        <input
                          id="auth-district"
                          className="auth-form-input"
                          type="text"
                          value={district}
                          onChange={(e) => setDistrict(e.target.value)}
                          placeholder="Tamil Nadu"
                          required
                        />
                      </div>
                      <div className="auth-form-group" style={{ flex: 1 }}>
                        <label className="auth-form-label" htmlFor="auth-village">
                          Village / Locality
                          <span className="auth-form-label-required">*</span>
                        </label>
                        <input
                          id="auth-village"
                          className="auth-form-input"
                          type="text"
                          value={village}
                          onChange={(e) => setVillage(e.target.value)}
                          placeholder="Erode"
                          required
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="auth-form-group">
                  <label className="auth-form-label" htmlFor="auth-password">
                    Password
                    <span className="auth-form-label-required">*</span>
                  </label>
                  <input
                    id="auth-password"
                    className={`auth-form-input${pwErrors.length ? " error" : ""}`}
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setPwErrors([]);
                    }}
                    placeholder={
                      authMode === "signup"
                        ? "Min 8 chars, uppercase, number, special"
                        : "Your password"
                    }
                    autoComplete={
                      authMode === "signup" ? "new-password" : "current-password"
                    }
                    required
                  />
                  {authMode === "signup" && (
                    <PasswordStrengthBar password={password} />
                  )}
                  {pwErrors.length > 0 && (
                    <div className="auth-form-error">
                      Password must include: {pwErrors.join(", ")}
                    </div>
                  )}
                  {confirmError && (
                    <div className="auth-form-error">{confirmError}</div>
                  )}
                  {authMode === "signin" && (
                    <div className="auth-checkbox-group" style={{ marginTop: 8 }}>
                      <input
                        type="checkbox"
                        id="remember-me"
                        className="auth-checkbox-input"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                      />
                      <label htmlFor="remember-me" className="auth-checkbox-label">
                        Remember me on this device
                      </label>
                    </div>
                  )}
                  {authMode === "signin" && (
                    <button
                      type="button"
                      className="auth-btn auth-btn-text"
                      onClick={() => setShowForgotPw(true)}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>

                {authMode === "signup" && (
                  <>
                    <div className="auth-form-group">
                      <label className="auth-form-label" htmlFor="auth-confirm-password">
                        Confirm Password
                        <span className="auth-form-label-required">*</span>
                      </label>
                      <input
                        id="auth-confirm-password"
                        className="auth-form-input"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          setConfirmError("");
                        }}
                        placeholder="Re-enter your password"
                        autoComplete="new-password"
                        required
                      />
                    </div>

                    <div className="auth-form-group">
                      <label className="auth-form-label" htmlFor="signup-role">
                        Your Role
                        <span className="auth-form-label-required">*</span>
                      </label>
                      <select
                        id="signup-role"
                        className="auth-form-select"
                        value={signupRole}
                        onChange={(e) => setSignupRole(e.target.value)}
                      >
                        <option value="buyer">🏨 Buyer</option>
                        <option value="farmer">🌾 Farmer</option>
                      </select>
                      <div className="auth-form-hint">
                        Choose a buyer or farmer account type to get the right marketplace experience.
                      </div>
                    </div>

                    <div className="auth-form-group">
                      <label className="auth-form-label" htmlFor="signup-type">
                        {signupRole === "farmer" ? "Farmer Type" : "Buyer Type"}
                        <span className="auth-form-label-required">*</span>
                      </label>
                      <select
                        id="signup-type"
                        className="auth-form-select"
                        value={signupType}
                        onChange={(e) => setSignupType(e.target.value)}
                      >
                        {signupRole === "farmer" ? (
                          <>
                            <option value="grower">🌾 Grower</option>
                            <option value="organic">🌿 Organic Farmer</option>
                            <option value="poultry">🐔 Poultry Farmer</option>
                            <option value="dairy">🥛 Dairy Farmer</option>
                          </>
                        ) : (
                          <>
                            <option value="hotel">🏨 Hotel Buyer</option>
                            <option value="restaurant">🍽️ Restaurant Buyer</option>
                            <option value="corporate">🏢 Corporate Buyer</option>
                            <option value="retailer">🛒 Retailer</option>
                          </>
                        )}
                      </select>
                      <div className="auth-form-hint">
                        Select the type that best matches your business or farm profile.
                      </div>
                    </div>

                    <div className="auth-checkbox-group">
                      <input
                        type="checkbox"
                        id="terms-check"
                        className="auth-checkbox-input"
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                      />
                      <label htmlFor="terms-check" className="auth-checkbox-label">
                        I agree to FarmConnect{" "}
                        <a href="#terms" onClick={(e) => { e.preventDefault(); alert("Terms of Service"); }}>
                          Terms of Service
                        </a>{" "}
                        and{" "}
                        <a href="#privacy" onClick={(e) => { e.preventDefault(); alert("Privacy Policy"); }}>
                          Privacy Policy
                        </a>
                      </label>
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  className="auth-btn auth-btn-primary"
                  disabled={
                    authLoading || rateLimitCooldown > 0 || (authMode === "signup" && !agreedToTerms)
                  }
                >
                  {authLoading ? "Processing…" : authMode === "signup" ? "Create Account" : "Sign In"}
                </button>
              </form>

              <div className="auth-divider">
                <div className="auth-divider-line" />
                <span>or</span>
                <div className="auth-divider-line" />
              </div>

              <p style={{ textAlign: "center", fontSize: "12px", color: G.stone }}>
                {authMode === "signin"
                  ? "Don't have an account? "
                  : "Already have an account? "}
                <button
                  type="button"
                  className="auth-btn auth-btn-text"
                  onClick={() => {
                    setAuthMode(authMode === "signin" ? "signup" : "signin");
                    setPassword("");
                    setPwErrors([]);
                    setAuthMessage("");
                    setAgreedToTerms(false);
                  }}
                  style={{ fontSize: "12px" }}
                >
                  {authMode === "signin" ? "Sign up here" : "Sign in here"}
                </button>
              </p>
            </div>

            <div className="auth-footer">
              🔐 Secured by Supabase Auth · End-to-end encrypted · Rate-limited login
              <br />
              <a href="#help" onClick={(e) => { e.preventDefault(); alert("Help & Support"); }}>Help & Support</a>
              {" "}·{" "}
              <a href="#status" onClick={(e) => { e.preventDefault(); alert("System Status"); }}>System Status</a>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPw && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
          onClick={() => setShowForgotPw(false)}
        >
          <div
            style={{
              background: "white",
              borderRadius: "20px",
              padding: "32px",
              maxWidth: "400px",
              width: "100%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 style={{ fontSize: "20px", fontWeight: 700, color: G.soil }}>
                Reset Password
              </h2>
              <button
                type="button"
                onClick={() => setShowForgotPw(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "20px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: "13px", color: G.stone, marginBottom: "16px" }}>
              Enter your email and we'll send you a password reset link.
            </p>
            {forgotStatus && (
              <div
                className={`auth-alert auth-alert-${forgotStatus.includes("sent") ? "success" : "warning"}`}
              >
                {forgotStatus}
              </div>
            )}
            <form onSubmit={handleForgotPassword}>
              <div className="auth-form-group">
                <label className="auth-form-label">Email Address</label>
                <input
                  className="auth-form-input"
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="your@email.com"
                />
              </div>
              <button
                type="submit"
                className="auth-btn auth-btn-primary"
                style={{ marginTop: "16px" }}
              >
                Send Reset Link
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
