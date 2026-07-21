import React, { createContext, useContext, useState, useCallback } from "react";

// ─── TRANSLATIONS ──────────────────────────────────────────────────
// Add more keys here as needed. Any key missing in "ta" automatically
// falls back to the English string, so the app never shows a blank label.
export const translations = {
  en: {
    // Brand / topbar
    brand_tagline: "India's Transparent Farm-to-Buyer Marketplace",
    home: "← Home",
    sign_out: "↪ Sign out",

    // Landing hero
    hero_title_1: "From Soil",
    hero_title_2: "to",
    hero_title_3: "Sale",
    hero_title_4: "— Direct",
    hero_sub: "No middlemen. No hidden fees. Every rupee tracked transparently.",
    hero_sub_2: "FarmConnect connects Tamil Nadu's farmers directly to hotels, restaurants, and corporates.",
    flow_farmer: "🌾 Farmer",
    flow_farmer_sub: "Lists at ₹35/kg",
    flow_platform: "FarmConnect",
    flow_platform_sub: "5% platform fee",
    flow_hotel: "🏨 Hotel",
    flow_hotel_sub: "Buys at ₹45/kg",
    flow_govt: "🏛️ Govt",
    flow_govt_sub: "GST collected",

    // Auth
    secure_auth: "🔐 Secure Authentication",
    sign_in: "Sign In",
    sign_up: "Sign Up",
    email: "Email",
    password: "Password",
    confirm_password: "Confirm Password",
    forgot_password: "Forgot password?",
    working: "Working…",
    create_account: "Create Account",
    signed_in_as: "Signed in as",
    request_account_deletion: "🗑 Request Account Deletion",
    security_footer: "🔒 Secured by Supabase Auth · bcrypt password hashing · JWT session tokens · Rate-limited sign-in",
    agree_terms_prefix: "By creating an account you agree to our",
    terms_of_service: "Terms of Service",
    and: "and",
    privacy_policy: "Privacy Policy",

    // Role cards / stats
    verified_farmers: "Verified Farmers",
    monthly_gmv: "Monthly GMV",
    farmer_income_boost: "Farmer Income Boost",
    gst_to_govt: "GST to Govt/Month",
    enter_dashboard: "Enter",

    // Modals
    reset_password: "Reset Password",
    reset_password_desc: "Enter your email and we'll send you a password reset link.",
    email_address: "Email Address",
    send_reset_email: "Send Reset Email",
    delete_account: "Delete Account",
    cancel: "Cancel",
    yes_delete_account: "Yes, Delete My Account",
    i_understand: "I Understand",
    i_agree: "I Agree",
    close: "Close",

    // Consent banner
    consent_text: "🍪 We use cookies strictly for authentication. No tracking, no ads.",
    accept_continue: "Accept & Continue",

    // Common dashboard chrome
    menu: "Menu",
    save_as_draft: "Save as Draft",
    edit: "Edit",
    search: "Search",
    status: "Status",
    date: "Date",
    amount: "Amount",
    action: "Action",
    quantity: "Quantity",
    grade: "Grade",
    qa_score: "QA Score",
    stock: "Stock",
    per: "per",

    // Farmer dashboard
    nav_home: "Home",
    nav_my_listings: "My Listings",
    nav_add_produce: "Add Produce",
    nav_orders: "Orders",
    nav_earnings: "Earnings",
    nav_govt_schemes: "Govt Schemes",
    good_morning: "Good morning, Raman 👋",
    farm_summary: "Here's your farm summary for today",
    this_month_earnings: "This Month's Earnings",
    active_listings: "Active Listings",
    pending_orders: "Pending Orders",
    rating: "Rating",
    recent_orders: "Recent Orders",
    order_id: "Order ID",
    buyer: "Buyer",
    produce: "Produce",
    publish_listing: "🚀 Publish Listing",
    uploading: "Uploading...",
    my_listings: "My Listings",
    orders: "Orders",
    earnings_payments: "Earnings & Payments",
    govt_schemes: "Government Schemes",
    your_share: "Your Share (90%)",

    // Buyer dashboard
    nav_browse_market: "Browse Market",
    nav_my_orders: "My Orders",
    nav_track_delivery: "Track Delivery",
    nav_invoices: "Invoices",
    fresh_market: "Fresh Market",
    fresh_market_sub: "Direct from verified Tamil Nadu farms · Updated daily",
    search_placeholder: "Search tomatoes, onions, spinach...",
    express_delivery: "⚡ Express Delivery",
    organic_only: "🌿 Organic Only",
    my_orders: "My Orders",
    track_delivery: "Track Delivery",
    gst_invoices: "GST Invoices",
    download_pdf: "⬇ Download PDF",
    farmer: "Farmer",
    gst_govt: "GST (Govt)",

    // Order modal
    place_order: "Place Order",
    escrow_protected: "Escrow-protected · GST invoice included",
    organic: "Organic",
    express: "Express",
    mandi: "Mandi",
    available: "Available",
    subtotal: "Subtotal",
    farmer_earns: "↳ Farmer earns (90%)",
    platform_fee_line: "↳ FarmConnect (5%)",
    gst_18: "GST (18% on platform fee)",
    total_payable: "Total Payable",
    pay_via_upi: "Pay ₹{total} via UPI →",
    payment_held_escrow: "🔒 Payment held in escrow · Released to farmer on delivery",

    // Admin/Govt dashboard
    nav_overview: "Overview",
    nav_tax_revenue: "Tax Revenue",
    nav_farmer_data: "Farmer Data",
    nav_scheme_impact: "Scheme Impact",
    nav_all_transactions: "All Transactions",
    nav_farmers: "Farmers",
    nav_users: "Users",
    nav_audit_logs: "Audit Logs",
    nav_disputes: "Disputes",
    nav_compliance: "Compliance",
    platform_overview: "Platform Overview",
    total_gmv: "Total GMV",
    platform_revenue: "Platform Revenue (5%)",
    govt_gst_revenue: "Govt GST Revenue",
    active_farmers: "Active Farmers",
    all_transactions: "All Transactions",
    user_access_control: "User Access Control",
    audit_logs: "Audit Logs",
    farmer_directory: "Farmer Directory",
    tax_revenue_breakdown: "Tax Revenue Breakdown",
    scheme_impact_report: "Scheme Impact Report",
    compliance_center: "Compliance Center",
    disputes: "Disputes",
    govt_revenue_dashboard: "Government Revenue Dashboard",

    // Status pill labels
    status_pending: "Pending",
    status_confirmed: "Confirmed",
    status_in_transit: "In Transit",
    status_delivered: "Delivered",
    status_cancelled: "Cancelled",

    // Role cards (label/description/badge per role)
    role_buyer_label: "Buyer",
    role_buyer_desc: "Browse fresh produce, place orders, download GST invoices",
    role_buyer_badge: "Buy Fresh",
    role_farmer_label: "Farmer",
    role_farmer_desc: "List your produce, get fair prices, track earnings & govt schemes",
    role_farmer_badge: "Sell Direct",
    role_admin_label: "Admin",
    role_admin_desc: "Full platform oversight, transactions, compliance & audit",
    role_admin_badge: "FarmConnect HQ",
    role_govt_label: "Government",
    role_govt_desc: "Read-only dashboard for tax data, scheme impact & farmer stats",
    role_govt_badge: "TN Agri Dept",

    // Language toggle
    language: "Language",
  },

  ta: {
    brand_tagline: "இந்தியாவின் வெளிப்படையான விவசாயி-வாங்குபவர் சந்தை",
    home: "← முகப்பு",
    sign_out: "↪ வெளியேறு",

    hero_title_1: "மண்ணிலிருந்து",
    hero_title_2: "",
    hero_title_3: "விற்பனை",
    hero_title_4: "வரை — நேரடியாக",
    hero_sub: "இடைத்தரகர் இல்லை. மறைமுக கட்டணம் இல்லை. ஒவ்வொரு ரூபாயும் வெளிப்படையாக கண்காணிக்கப்படும்.",
    hero_sub_2: "தமிழ்நாட்டு விவசாயிகளை ஹோட்டல்கள், உணவகங்கள் மற்றும் நிறுவனங்களுடன் நேரடியாக இணைக்கிறது FarmConnect.",
    flow_farmer: "🌾 விவசாயி",
    flow_farmer_sub: "₹35/கிலோவில் பட்டியலிடுகிறார்",
    flow_platform: "FarmConnect",
    flow_platform_sub: "5% தள கட்டணம்",
    flow_hotel: "🏨 ஹோட்டல்",
    flow_hotel_sub: "₹45/கிலோவில் வாங்குகிறது",
    flow_govt: "🏛️ அரசு",
    flow_govt_sub: "ஜிஎஸ்டி வசூலிக்கப்பட்டது",

    secure_auth: "🔐 பாதுகாப்பான உள்நுழைவு",
    sign_in: "உள்நுழை",
    sign_up: "பதிவு செய்",
    email: "மின்னஞ்சல்",
    password: "கடவுச்சொல்",
    confirm_password: "கடவுச்சொல்லை உறுதிப்படுத்தவும்",
    forgot_password: "கடவுச்சொல் மறந்துவிட்டதா?",
    working: "செயலாக்கம்…",
    create_account: "கணக்கை உருவாக்கு",
    signed_in_as: "இவராக உள்நுழைந்துள்ளீர்கள்",
    request_account_deletion: "🗑 கணக்கை நீக்க கோரிக்கை",
    security_footer: "🔒 Supabase Auth மூலம் பாதுகாக்கப்பட்டது · bcrypt கடவுச்சொல் என்க்ரிப்ஷன் · JWT அமர்வு டோக்கன்கள் · வரம்பிடப்பட்ட உள்நுழைவு",
    agree_terms_prefix: "கணக்கை உருவாக்குவதன் மூலம் நீங்கள் எங்கள்",
    terms_of_service: "சேவை விதிமுறைகள்",
    and: "மற்றும்",
    privacy_policy: "தனியுரிமைக் கொள்கை",

    verified_farmers: "சரிபார்க்கப்பட்ட விவசாயிகள்",
    monthly_gmv: "மாதாந்திர விற்பனை மதிப்பு",
    farmer_income_boost: "விவசாயி வருமான உயர்வு",
    gst_to_govt: "மாதம் ஜிஎஸ்டி (அரசுக்கு)",
    enter_dashboard: "நுழை",

    reset_password: "கடவுச்சொல்லை மீட்டமை",
    reset_password_desc: "உங்கள் மின்னஞ்சலை உள்ளிடவும், கடவுச்சொல் மீட்டமைப்பு இணைப்பை அனுப்புவோம்.",
    email_address: "மின்னஞ்சல் முகவரி",
    send_reset_email: "மீட்டமைப்பு மின்னஞ்சலை அனுப்பு",
    delete_account: "கணக்கை நீக்கு",
    cancel: "ரத்து செய்",
    yes_delete_account: "ஆம், என் கணக்கை நீக்கவும்",
    i_understand: "புரிந்துகொண்டேன்",
    i_agree: "ஒப்புக்கொள்கிறேன்",
    close: "மூடு",

    consent_text: "🍪 உள்நுழைவுக்காக மட்டுமே குக்கீகளைப் பயன்படுத்துகிறோம். கண்காணிப்பு இல்லை, விளம்பரம் இல்லை.",
    accept_continue: "ஏற்று தொடரவும்",

    menu: "மெனு",
    save_as_draft: "வரைவாக சேமி",
    edit: "திருத்து",
    search: "தேடு",
    status: "நிலை",
    date: "தேதி",
    amount: "தொகை",
    action: "செயல்",
    quantity: "அளவு",
    grade: "தரம்",
    qa_score: "தர மதிப்பெண்",
    stock: "கையிருப்பு",
    per: "ஒரு",

    nav_home: "முகப்பு",
    nav_my_listings: "என் பட்டியல்கள்",
    nav_add_produce: "விளைபொருள் சேர்",
    nav_orders: "ஆர்டர்கள்",
    nav_earnings: "வருமானம்",
    nav_govt_schemes: "அரசு திட்டங்கள்",
    good_morning: "காலை வணக்கம், ரமன் 👋",
    farm_summary: "இன்றைய உங்கள் பண்ணை சுருக்கம் இதோ",
    this_month_earnings: "இந்த மாத வருமானம்",
    active_listings: "செயலில் உள்ள பட்டியல்கள்",
    pending_orders: "நிலுவையிலுள்ள ஆர்டர்கள்",
    rating: "மதிப்பீடு",
    recent_orders: "சமீபத்திய ஆர்டர்கள்",
    order_id: "ஆர்டர் எண்",
    buyer: "வாங்குபவர்",
    produce: "விளைபொருள்",
    publish_listing: "🚀 பட்டியலை வெளியிடு",
    uploading: "பதிவேற்றுகிறது...",
    my_listings: "என் பட்டியல்கள்",
    orders: "ஆர்டர்கள்",
    earnings_payments: "வருமானம் & கட்டணங்கள்",
    govt_schemes: "அரசு திட்டங்கள்",
    your_share: "உங்கள் பங்கு (90%)",

    nav_browse_market: "சந்தையை பார்",
    nav_my_orders: "என் ஆர்டர்கள்",
    nav_track_delivery: "டெலிவரியை கண்காணி",
    nav_invoices: "விலைப்பட்டியல்கள்",
    fresh_market: "புதிய சந்தை",
    fresh_market_sub: "சரிபார்க்கப்பட்ட தமிழ்நாடு பண்ணைகளில் இருந்து நேரடியாக · தினமும் புதுப்பிக்கப்படும்",
    search_placeholder: "தக்காளி, வெங்காயம், கீரை தேடு...",
    express_delivery: "⚡ விரைவு டெலிவரி",
    organic_only: "🌿 இயற்கை உணவு மட்டும்",
    my_orders: "என் ஆர்டர்கள்",
    track_delivery: "டெலிவரியை கண்காணி",
    gst_invoices: "ஜிஎஸ்டி விலைப்பட்டியல்கள்",
    download_pdf: "⬇ PDF பதிவிறக்கு",
    farmer: "விவசாயி",
    gst_govt: "ஜிஎஸ்டி (அரசு)",

    place_order: "ஆர்டர் செய்",
    escrow_protected: "எஸ்க்ரோ பாதுகாப்பு · ஜிஎஸ்டி விலைப்பட்டியல் அடங்கும்",
    organic: "இயற்கை",
    express: "விரைவு",
    mandi: "மண்டி",
    available: "கிடைக்கும்",
    subtotal: "துணைத்தொகை",
    farmer_earns: "↳ விவசாயிக்கு (90%)",
    platform_fee_line: "↳ FarmConnect (5%)",
    gst_18: "ஜிஎஸ்டி (தள கட்டணத்தில் 18%)",
    total_payable: "செலுத்த வேண்டிய மொத்தம்",
    pay_via_upi: "UPI மூலம் ₹{total} செலுத்து →",
    payment_held_escrow: "🔒 பணம் எஸ்க்ரோவில் வைக்கப்படும் · டெலிவரியில் விவசாயிக்கு வழங்கப்படும்",

    nav_overview: "மேலோட்டம்",
    nav_tax_revenue: "வரி வருவாய்",
    nav_farmer_data: "விவசாயி தரவு",
    nav_scheme_impact: "திட்ட தாக்கம்",
    nav_all_transactions: "அனைத்து பரிவர்த்தனைகள்",
    nav_farmers: "விவசாயிகள்",
    nav_users: "பயனர்கள்",
    nav_audit_logs: "தணிக்கை பதிவுகள்",
    nav_disputes: "தகராறுகள்",
    nav_compliance: "இணக்கம்",
    platform_overview: "தள மேலோட்டம்",
    total_gmv: "மொத்த விற்பனை மதிப்பு",
    platform_revenue: "தள வருவாய் (5%)",
    govt_gst_revenue: "அரசு ஜிஎஸ்டி வருவாய்",
    active_farmers: "செயலில் உள்ள விவசாயிகள்",
    all_transactions: "அனைத்து பரிவர்த்தனைகள்",
    user_access_control: "பயனர் அணுகல் கட்டுப்பாடு",
    audit_logs: "தணிக்கை பதிவுகள்",
    farmer_directory: "விவசாயி அடைவு",
    tax_revenue_breakdown: "வரி வருவாய் விவரம்",
    scheme_impact_report: "திட்ட தாக்க அறிக்கை",
    compliance_center: "இணக்க மையம்",
    disputes: "தகராறுகள்",
    govt_revenue_dashboard: "அரசு வருவாய் டாஷ்போர்டு",

    status_pending: "நிலுவையில்",
    status_confirmed: "உறுதி செய்யப்பட்டது",
    status_in_transit: "வழியில் உள்ளது",
    status_delivered: "வழங்கப்பட்டது",
    status_cancelled: "ரத்து செய்யப்பட்டது",

    language: "மொழி",

    role_buyer_label: "வாங்குபவர்",
    role_buyer_desc: "புதிய விளைபொருட்களை பார்வையிடு, ஆர்டர் செய், ஜிஎஸ்டி விலைப்பட்டியல்களை பதிவிறக்கு",
    role_buyer_badge: "புதியதை வாங்கு",
    role_farmer_label: "விவசாயி",
    role_farmer_desc: "உங்கள் விளைபொருளை பட்டியலிடு, நியாயமான விலை பெறு, வருமானம் & அரசு திட்டங்களை கண்காணி",
    role_farmer_badge: "நேரடியாக விற்று",
    role_admin_label: "நிர்வாகி",
    role_admin_desc: "முழு தள மேற்பார்வை, பரிவர்த்தனைகள், இணக்கம் & தணிக்கை",
    role_admin_badge: "FarmConnect தலைமையகம்",
    role_govt_label: "அரசு",
    role_govt_desc: "வரி தரவு, திட்ட தாக்கம் & விவசாயி புள்ளிவிவரங்களுக்கான படிக்க-மட்டும் டாஷ்போர்டு",
    role_govt_badge: "தமிழ்நாடு விவசாயத் துறை",
  },
};

// ─── CONTEXT ────────────────────────────────────────────────────────
const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      return localStorage.getItem("fc_lang") || "en";
    } catch {
      return "en";
    }
  });

  const setLang = useCallback((next) => {
    setLangState(next);
    try {
      localStorage.setItem("fc_lang", next);
    } catch {
      /* ignore storage errors (e.g. private browsing) */
    }
  }, []);

  const t = useCallback(
    (key, vars) => {
      const dict = translations[lang] || translations.en;
      let str = dict[key] ?? translations.en[key] ?? key;
      if (vars) {
        Object.keys(vars).forEach((k) => {
          str = str.replace(`{${k}}`, vars[k]);
        });
      }
      return str;
    },
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return ctx;
}

// Small reusable toggle switch: EN | தமிழ்
export function LanguageToggle({ style }) {
  const { lang, setLang } = useLanguage();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        background: "rgba(255,255,255,0.12)",
        borderRadius: 8,
        padding: 2,
        ...style,
      }}
    >
      {["en", "ta"].map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          style={{
            border: "none",
            cursor: "pointer",
            padding: "5px 10px",
            fontSize: 12,
            fontWeight: 600,
            borderRadius: 6,
            fontFamily: "'Inter', sans-serif",
            background: lang === code ? "white" : "transparent",
            color: lang === code ? "#1B4332" : "rgba(255,255,255,0.75)",
            transition: "all 0.15s ease",
          }}
        >
          {code === "en" ? "EN" : "தமிழ்"}
        </button>
      ))}
    </div>
  );
}
