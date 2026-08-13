# AgriLens Platform — Complete Setup & Deployment Guide

## 1. ENVIRONMENT CONFIGURATION

### Create `.env.local` file in project root:

```bash
# Supabase Configuration (Required)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key-here

# API Configuration
VITE_API_BASE_URL=https://your-project.supabase.co/functions/v1

# Razorpay Configuration (Optional - for payments)
VITE_RAZORPAY_KEY_ID=your-razorpay-key-id
VITE_RAZORPAY_KEY_SECRET=your-razorpay-key-secret

# QR Code Generation (Optional - uses api.qrserver.com by default)
VITE_QR_CODE_SERVICE_URL=https://api.qrserver.com/v1/create-qr-code

# Analytics (Optional)
VITE_ENABLE_ANALYTICS=true
```

### Get Supabase Credentials:

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Create a new project or select existing
3. Project Settings → API → Copy:
   - Project URL (VITE_SUPABASE_URL)
   - Anon Public Key (VITE_SUPABASE_ANON_KEY)

---

## 2. DATABASE SETUP

### Step 1: Run Database Schema Migration

```bash
# Option A: Using Supabase CLI (Recommended)
supabase db push --db-url postgresql://username:password@db.host/dbname < supabase-schema-agrilens.sql

# Option B: Using Supabase Dashboard SQL Editor
# 1. Go to Supabase Dashboard → Project → SQL Editor
# 2. Create New Query
# 3. Copy entire contents of supabase-schema-agrilens.sql
# 4. Run Query
```

### Step 2: Verify Tables Created

```sql
-- Check all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- Expected tables:
-- - profiles
-- - farmer_digital_ids
-- - products
-- - orders
-- - payments
-- - government_schemes
-- - scheme_applications
-- - audit_logs
-- - login_events
```

### Step 3: Enable RLS (Row Level Security)

```sql
-- All RLS policies are automatically created by schema file
-- Verify they're enabled:
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;
```

---

## 3. AUTHENTICATION SETUP

### Supabase Auth Configuration

1. **Enable Email Provider:**
   - Dashboard → Authentication → Providers → Email
   - Enable "Confirm email" (recommended for security)

2. **Configure Redirect URLs:**
   - Dashboard → Authentication → URL Configuration
   - Redirect URLs:
     - Development: `http://localhost:5173`
     - Production: `https://yourdomain.com`

3. **Email Templates (Optional):**
   - Customize email confirmation and password reset templates
   - Dashboard → Authentication → Email Templates

### Setup Magic Link Login (Passwordless):

1. Dashboard → Authentication → Providers → Email
2. Enable "Enable Passwordless login with email"

---

## 4. PAYMENT GATEWAY SETUP (Razorpay)

### Create Razorpay Account

1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com)
2. Create account and verify business
3. Get API Keys:
   - Settings → API Keys
   - Copy Key ID and Key Secret
   - Add to `.env.local`

### Configure Webhook (For Payment Notifications)

```
1. Razorpay Dashboard → Settings → Webhooks
2. Add webhook URL: https://yourdomain.com/api/razorpay-webhook
3. Events to subscribe:
   - payment.captured
   - payment.failed
   - refund.created
```

---

## 5. BUILD & DEPLOYMENT

### Development

```bash
# Install dependencies
npm install

# Start development server (hot reload)
npm run dev

# Access at http://localhost:5173
```

### Production Build

```bash
# Build for production
npm run build

# This creates optimized dist/ folder

# Test production build locally
npm run preview
```

### Deploy to Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts and configure environment variables in dashboard
```

### Deploy to Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod

# Configure environment variables in Netlify dashboard
```

### Deploy to Custom Server

```bash
# Build
npm run build

# Copy dist/ folder to your web server
# Configure CORS and environment variables

# Example Nginx config:
server {
    listen 80;
    server_name yourdomain.com;

    root /var/www/agrilens/dist;
    index index.html;

    location / {
        try_files $uri /index.html;
    }
}
```

---

## 6. FARMER ID VERIFICATION WORKFLOW

### Admin Flow (Verification):

```javascript
// 1. Farmer submits application with documents
// Frontend: DashboardShell → FarmerDashboard → ID Card Section

// 2. Admin reviews at: AdminDashboard → Farmer Verification
// Admin approves/rejects

// 3. On approval, digital ID is automatically created
// Farmer can download QR code and apply for physical card

// 4. Government receives ID in scheme applications
// Can verify farmer at checkpoints by scanning QR
```

---

## 7. GOVERNMENT SCHEME WORKFLOW

### Complete Process:

```
1. GOVT CREATES SCHEME
   ↓
   GovernmentDashboard → Schemes → Create New Scheme
   Eligibility criteria (district, farm size, crops)
   Benefit amount and dates

2. FARMER DISCOVERS SCHEME
   ↓
   FarmerDashboard → Schemes tab
   Auto-filters based on eligibility

3. FARMER APPLIES
   ↓
   FarmerDashboard → Schemes → Apply Now
   Submits supporting documents (JSONB storage)

4. GOVT REVIEWS APPLICATION
   ↓
   GovernmentDashboard → Applications
   Review farmer details, documents
   Approve/Reject with benefit amount

5. FARMER BENEFITS
   ↓
   Benefit amount disbursed to farmer
   Logged in scheme_applications table
   Farmer can track status in dashboard
```

---

## 8. ORDER & PAYMENT FLOW

### Customer Journey:

```
1. BUYER BROWSES PRODUCTS
   BuyerDashboard → Marketplace
   Search, filter, view farmer details

2. BUYER PLACES ORDER
   Click "Place Order"
   Confirm delivery address & quantity
   System creates order with escrow holding

3. PAYMENT PROCESSING
   Order status: "pending"
   Razorpay capture payment
   Payment status: "processing" → "completed"

4. FARMER CONFIRMS
   Farmer sees order in dashboard
   Marks as "confirmed" → "dispatched" → "delivered"
   On delivery, payment released (90% to farmer)

5. COMPLETION
   Buyer receives order, can rate farmer
   Farmer earnings tracked in database
   Both parties can download invoices
```

---

## 9. SECURITY BEST PRACTICES

### Frontend Security:

- ✅ Input sanitization (sanitize.js)
- ✅ Rate limiting (rateLimiter.js)
- ✅ CSRF tokens via Supabase sessions
- ✅ No sensitive data in localStorage except settings
- ✅ MFA support (mfa_enabled field in profiles)

### Database Security (RLS Policies):

- ✅ Farmers can ONLY see their own profiles & products
- ✅ Buyers can ONLY see own orders & payments
- ✅ Government can ONLY READ farmer data (no write)
- ✅ Admin has oversight but limited by policies
- ✅ Audit logs are INSERT-only (immutable)

### Deployment Security:

```bash
# Use HTTPS only in production
# Enable CORS properly in Supabase
# Rotate API keys regularly
# Enable audit logging (enabled by default)
# Use strong database passwords
# Enable firewall rules on database
```

---

## 10. MONITORING & SUPPORT

### Health Checks:

```bash
# Monitor RLS policy effectiveness
SELECT * FROM public.audit_logs 
ORDER BY created_at DESC LIMIT 20;

# Check farmer verification status
SELECT full_name, verification_status, verified_at 
FROM public.profiles 
WHERE role = 'farmer' 
ORDER BY created_at DESC;

# Monitor payment processing
SELECT status, COUNT(*) FROM public.payments 
GROUP BY status;
```

### Troubleshooting:

**Issue: Farmers can't see their own products**
- Verify is_verified=true in profiles
- Check RLS policies on products table
- Ensure role is 'farmer' in profiles

**Issue: Payment webhook not firing**
- Verify webhook URL is accessible
- Check Razorpay webhook logs
- Ensure firewall allows Razorpay IPs

**Issue: QR code not generating**
- Verify VITE_QR_CODE_SERVICE_URL
- Check internet connectivity
- Validate QR data JSON format

---

## 11. PERFORMANCE OPTIMIZATION

### Frontend:

```javascript
// Code splitting already enabled via Vite
// Images lazy-load automatically
// Use React.memo() for expensive components
// Implement infinite scroll for product lists
```

### Database:

```sql
-- Create indexes for common queries
CREATE INDEX idx_products_farmer_id_active 
ON products(farmer_id, is_active);

CREATE INDEX idx_orders_farmer_status 
ON orders(farmer_id, status);

CREATE INDEX idx_scheme_applications_farmer_status 
ON scheme_applications(farmer_id, application_status);
```

### Caching:

- Supabase caches queries automatically
- Use localStorage for settings (already implemented)
- Implement Redis for session caching if scale requires

---

## 12. GOING TO PRODUCTION CHECKLIST

- [ ] Environment variables configured
- [ ] Database schema migrated
- [ ] RLS policies verified
- [ ] Auth email templates customized
- [ ] Razorpay keys configured & webhooks added
- [ ] HTTPS enabled
- [ ] Redirect URLs set in Supabase
- [ ] Rate limiting tested
- [ ] Audit logging verified
- [ ] Admin users created and verified
- [ ] Test farmer ID workflow end-to-end
- [ ] Test scheme application workflow
- [ ] Test payment flow with test Razorpay account
- [ ] Backup database configured
- [ ] Error monitoring (Sentry/LogRocket) setup
- [ ] Analytics configured
- [ ] GDPR/compliance policies in place

---

## 13. SUPPORT & RESOURCES

**Documentation:**
- [Supabase Docs](https://supabase.com/docs)
- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [Razorpay API Reference](https://razorpay.com/docs)

**Contact Support:**
- GitHub Issues: [Your repo]
- Email: support@agrilens.example
- Live Chat: [Your support portal]
