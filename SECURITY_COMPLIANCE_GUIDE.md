# AgriLens Platform — Security & Compliance Guide

## 1. SECURITY ARCHITECTURE

### 1.1 Defense in Depth Model

AgriLens implements security at multiple layers:

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: FRONTEND VALIDATION                                │
│ - Input sanitization (sanitize.js)                          │
│ - Rate limiting (rateLimiter.js)                            │
│ - Type checking & form validation                           │
│ Purpose: Improve UX, prevent simple errors                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: TRANSPORT SECURITY                                 │
│ - HTTPS/TLS for all communication                           │
│ - Supabase JWT tokens in Authorization headers              │
│ - CORS enabled only for trusted origins                     │
│ Purpose: Prevent man-in-the-middle attacks                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: AUTHENTICATION & AUTHORIZATION                     │
│ - Supabase Auth (JWT-based)                                 │
│ - Session management via Supabase                           │
│ - MFA support (mfa_enabled flag)                            │
│ Purpose: Identify user and verify legitimate access         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 4: ROW-LEVEL SECURITY (RLS) — PRIMARY LAYER          │
│ - Database-enforced policies (supabase-schema-agrilens.sql)│
│ - 27 granular RLS policies per table                        │
│ - Policies check: user role, ownership, business rules      │
│ Purpose: Enforce data access at SQL execution time          │
│           (CANNOT be bypassed by frontend)                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 5: AUDIT LOGGING                                      │
│ - All changes logged to audit_logs table                    │
│ - Immutable: INSERT-only, no UPDATE/DELETE                  │
│ - Triggers auto-log INSERT/UPDATE/DELETE on key tables      │
│ Purpose: Compliance, investigation, forensics               │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Role-Based Access Control (RBAC)

Four roles with strict permission boundaries:

```sql
-- Role Hierarchy
┌─────────────┐
│   FARMER    │ (selfAssignable: true)
│ • View own profile, products, orders, schemes
│ • Create products (if verified)
│ • Apply for schemes (if eligible)
│ • Cannot view other farmers or payment details
└─────────────┘

┌─────────────┐
│    BUYER    │ (selfAssignable: true)
│ • View marketplace products
│ • Create orders, view own orders
│ • Cannot view farmer details beyond product info
│ • Cannot approve/verify anything
└─────────────┘

┌─────────────┐
│    ADMIN    │ (selfAssignable: false)
│ • View all users, products, orders
│ • Verify farmers (approve/reject)
│ • Review scheme applications
│ • Audit all transactions
│ • Cannot create/approve schemes (govt only)
└─────────────┘

┌─────────────┐
│  GOVERNMENT │ (selfAssignable: false)
│ • Create schemes
│ • Review scheme applications
│ • READ-ONLY access to farmer data (no edit)
│ • Cannot verify farmers or manage orders
└─────────────┘
```

### 1.3 RLS Policies (27 Total)

Each policy follows pattern: `<resource>_<action>_<role>_<condition>`

**PROFILES (4 policies):**
- `profiles_select_own_or_admin`: Users see own, admins/govt see all
- `profiles_insert_own_self_service`: Users insert own (farmer/buyer roles only)
- `profiles_update_own`: Users update own (cannot change role)
- `profiles_update_admin`: Admins can update any profile (including role)

**PRODUCTS (6 policies):**
- `products_select_public`: Anyone can view active products
- `products_select_own`: Farmers see all their products (including inactive)
- `products_select_admin`: Admins see all products
- `products_insert_verified_farmer`: Only verified farmers can insert
- `products_manage_own`: Farmers manage their products
- `products_admin_all`: Admins have full control

**ORDERS (6 policies):**
- `orders_select_own_buyer`: Buyers see own orders
- `orders_select_own_farmer`: Farmers see orders for their products
- `orders_select_admin`: Admins see all orders
- `orders_insert_buyer`: Only buyers can create orders
- `orders_update_farmer_status`: Farmers update status
- `orders_update_buyer`: Buyers confirm orders
- `orders_admin_all`: Admins manage all

**PAYMENTS (5 policies):**
- `payments_select_buyer`: Buyers see own payments
- `payments_select_farmer`: Farmers see payments for their orders
- `payments_select_admin`: Admins see all
- `payments_insert_admin`: Only backend/admin can insert
- `payments_update_admin`: Only backend/admin can update

**GOVERNMENT SCHEMES (2 policies):**
- `schemes_select_all_active`: Anyone can view active schemes
- `schemes_manage_govt`: Only govt/admin can manage

**SCHEME APPLICATIONS (4 policies):**
- `scheme_applications_select_own`: Farmers see own
- `scheme_applications_insert_farmer`: Farmers create own
- `scheme_applications_update_farmer`: Farmers update own (draft/submitted)
- `scheme_applications_select_govt`: Govt/admin can review
- `scheme_applications_update_govt`: Govt/admin can approve/reject

---

## 2. DATA PROTECTION

### 2.1 Sensitive Data Classification

```
PUBLIC (Can be shown to anyone):
- Product names, prices, images
- Farmer name, district, village
- Average ratings

INTERNAL (Only role-specific access):
- Farmer PAN, Aadhar (only to admin/govt)
- Order delivery addresses (only to farmer/buyer)
- Payment amounts & transaction details (only to involved parties)
- Farm size details (only to farmer & govt for eligibility)

CONFIDENTIAL (Maximum restriction):
- Digital signatures on QR codes
- Farmer verification documents
- Government benefit disbursement records
- Audit logs (only admins)
```

### 2.2 Data Retention Policy

```
RETENTION PERIODS:

User Account Data:
- Active profiles: Retained indefinitely (except deleted accounts)
- Deleted profiles: Soft-deleted (is_deleted=true), retained 365 days for audit

Transaction Data:
- Orders: Retained indefinitely for audit trail
- Payments: Retained indefinitely for financial compliance
- Audit logs: Immutable, retained indefinitely

Personal Documents:
- Verification documents: Retained 3 years (tax/govt compliance)
- Supporting docs (schemes): Retained 7 years (govt requirement)

DELETION:
- Users can request account deletion (soft-delete in database)
- Admin can trigger GDPR-compliant full data erasure
- Audit trail preserved for 7 years minimum
```

### 2.3 Encryption

```
IN TRANSIT:
✅ HTTPS/TLS 1.2+ (enforced by Supabase)
✅ JWT tokens in Authorization headers
✅ No sensitive data in URLs

AT REST:
✅ Supabase encrypts all database at-rest (AES-256)
✅ Sensitive fields (PAN, Aadhar) stored encrypted in database
✅ Passwords hashed by Supabase Auth (bcrypt)

IN CODE:
✅ No hardcoded secrets (use .env variables)
✅ API keys never logged or exposed
✅ Audit logs redact passwords/tokens before storage
```

---

## 3. AUTHENTICATION & SESSION SECURITY

### 3.1 Auth Flow

```
FARMER/BUYER SIGNUP:
1. User enters email → supabase.auth.signUp()
2. Supabase sends confirmation email
3. User clicks link, email verified
4. Create profiles record with role
5. Frontend stores JWT in session
6. User can now access dashboard (RLS validates)

ADMIN/GOVERNMENT ASSIGNMENT:
1. Only existing admin can assign roles
2. No self-service for admin/govt roles
3. Admin changes role via profiles table
4. RLS policies check role on every request
5. If role invalid, query returns 0 rows

SESSION MANAGEMENT:
- JWT tokens valid for 1 hour
- Refresh tokens valid for 30 days
- Automatic refresh handled by Supabase SDK
- Logout clears tokens from browser
- Session timeout after 30 min inactivity (recommended)
```

### 3.2 MFA (Multi-Factor Authentication)

```
OPTIONAL MFA:
- mfa_enabled BOOLEAN field in profiles
- Supabase native MFA support via TOTP
- Users can opt-in in SettingsPanel

ENABLING MFA:
1. User generates TOTP secret (QR code)
2. Scan with Authenticator app
3. Confirm with generated code
4. mfa_enabled = true
5. On next login, MFA required

ADMIN CAN ENFORCE:
- In production, make MFA mandatory for farmers
- Require MFA for admins & govt officers
```

---

## 4. COMPLIANCE & REGULATIONS

### 4.1 GDPR Compliance

```
REQUIREMENTS → IMPLEMENTATION:

Lawful Basis (Article 6):
✅ Consent: Users accept privacy policy before signup
✅ Contract: Service provision (marketplace)
✅ Compliance: Legal obligation (farmer schemes)

Right to Access (Article 15):
✅ Users can export their data via dashboard
✅ Data includes: Profile, products, orders, earnings

Right to Erasure (Article 17):
✅ Users can request account deletion
✅ Soft-delete: Marks is_deleted=true
✅ Hard-delete: Backend job deletes after 30 days (optional)

Data Portability (Article 20):
✅ Export all personal data in JSON format
✅ API endpoint: GET /api/user/data/export

Privacy by Design:
✅ RLS: Only necessary data visible to each user
✅ Audit: Log who accessed what data
✅ Minimization: Don't store unnecessary data

Data Processing Agreement (DPA):
✅ Sign DPA with Supabase (they're your processor)
✅ Keep copy for compliance audits
```

### 4.2 India-Specific Compliance

```
REGULATIONS:

Digital Personal Data Protection Act (DPDP) 2023:
✅ Privacy policy published (link in landing page)
✅ Lawful basis defined (agriculture service)
✅ Farmer consent documented
✅ Data retention policy defined
✅ Breach notification plan in place

Payment Regulation (RBI):
✅ Use licensed payment gateway (Razorpay)
✅ PCI-DSS compliant (Razorpay handles this)
✅ Never store card details in our database
✅ Escrow mechanism for farmer protection

Agricultural Schemes:
✅ Farmer eligibility verified at DB level
✅ Scheme rules enforced in RLS policies
✅ Government can audit all applications
✅ Benefit disbursement logged for audit

Tax Compliance (GST):
✅ GST 18% on platform fees (stored in orders table)
✅ Invoice generation for compliance
✅ Seller GST number captured (buyers)
✅ Monthly reconciliation possible
```

### 4.3 Agricultural Data Governance

```
FARMER DATA OWNERSHIP:
✅ Farmer owns their farm data (land size, location, crops)
✅ Farmer can control visibility to govt/schemes
✅ No selling farmer data to third parties
✅ Farmer can export/delete farm records

SCHEME DATA GOVERNANCE:
✅ Government owns scheme definitions
✅ Farmer owns scheme applications
✅ Benefit records belong to farmer
✅ Audit trail owned by platform

PROTECTION AGAINST:
✅ Unauthorized data access (RLS policies)
✅ Data staleness (real-time updates)
✅ Unintended visibility (RBAC)
✅ Fraudulent scheme claims (verification workflow)
```

---

## 5. SECURITY TESTING & VALIDATION

### 5.1 Common Attack Prevention

```
ATTACK                    → PREVENTION

SQL Injection:
- Attacker tries: ' OR '1'='1
- Prevention: Parameterized queries (Supabase SDK uses these)
- Additional: Input validation in sanitize.js

Cross-Site Scripting (XSS):
- Attacker tries: <script>alert('xss')</script> in product name
- Prevention: Input sanitization (sanitizeText)
- Additional: React escapes by default, no dangerouslySetInnerHTML

Cross-Site Request Forgery (CSRF):
- Attacker tries: Trick farmer into clicking malicious link
- Prevention: JWT in Authorization header (not cookies)
- Additional: SameSite cookies configured in Supabase

Brute Force Attacks:
- Attacker tries: 1000 login attempts per minute
- Prevention: Rate limiting (rateLimiter.js - 5 attempts per 15 min)
- Additional: Account lockout after failed attempts

Privilege Escalation:
- Attacker tries: Change role from 'buyer' to 'admin'
- Prevention: RLS policy checks role change (prevents client-side modification)
- Additional: Only admin can change roles

Data Exposure:
- Attacker tries: Access another farmer's products
- Prevention: RLS policy filters by ownership
- Additional: Audit logs track every access

Payment Tampering:
- Attacker tries: Modify order amount before payment
- Prevention: Backend calculates amounts, immutable in DB
- Additional: Razorpay validates amount server-side
```

### 5.2 Manual Security Audit Checklist

```
□ Auth & Session:
  □ Try login with wrong password (fails)
  □ Try access without login (redirects to auth)
  □ Try use expired JWT (rejects)
  □ Try change role via browser dev tools (RLS prevents)

□ Data Access:
  □ Farmer tries view other farmer's products (RLS blocks)
  □ Buyer tries view farmer's earnings (RLS blocks)
  □ Government tries modify farmer data (RLS blocks)
  □ Admin tries delete audit log (RLS prevents - insert-only)

□ Payment Security:
  □ Try modify order amount in browser (backend recalculates)
  □ Try submit order for negative amount (validation rejects)
  □ Try pay without authentication (RLS blocks insert)

□ Rate Limiting:
  □ Try 10 login attempts (5th attempt blocked)
  □ Try 5 OTP attempts (4th attempt blocked)

□ Input Validation:
  □ Try XSS payload in product name (sanitized)
  □ Try huge file upload (validation rejects > 5MB)
  □ Try invalid email (rejected by validator)
```

---

## 6. INCIDENT RESPONSE PLAN

### 6.1 Security Breach Response

```
STEP 1: DETECTION (0-1 hour)
- Monitor audit_logs for suspicious patterns
- Alert on multiple failed logins
- Check payment webhook failures
- Action: Page on-call security team

STEP 2: CONTAINMENT (1-4 hours)
- Disable affected user account
- Revoke compromised JWT tokens
- Block suspicious IP addresses
- Action: Restrict access to prevent further damage

STEP 3: INVESTIGATION (4-24 hours)
- Query audit_logs for full incident timeline
- Analyze login_events for attack pattern
- Review payment records for fraud
- Action: Document evidence, notify legal

STEP 4: COMMUNICATION (24 hours)
- Notify affected users via email
- Report to regulatory bodies if required (DPDP)
- Publish incident report (transparency)
- Action: Restore trust, provide remediation

STEP 5: REMEDIATION (Ongoing)
- Fix vulnerability (code/config change)
- Deploy fix to production
- Verify fix works (security test)
- Action: Prevent recurrence
```

### 6.2 Breach Notification Policy

```
MANDATORY DISCLOSURE:
- PAN/Aadhar exposure: Notify within 72 hours (DPDP)
- Payment card data: Notify within 24 hours (RBI)
- Password/auth leak: Immediate password reset required
- Scheme data exposure: Notify government, farmers

NOTIFICATION INCLUDES:
- What data was exposed
- When incident discovered
- Remediation steps taken
- How users can protect themselves
- Contact info for questions
```

---

## 7. DEPLOYMENT SECURITY

### 7.1 Production Checklist

```
BEFORE DEPLOYING:
□ All environment variables configured (.env.local)
□ Database schema migrated (supabase-schema-agrilens.sql)
□ RLS policies verified (SELECT * FROM pg_policies)
□ HTTPS enabled (certificates valid)
□ CORS configured (only trusted origins)
□ Backup configured (daily snapshots)
□ Monitoring enabled (error tracking)
□ Logs centralized (Sentry/CloudWatch)
□ Rate limiting tuned (for expected traffic)
□ Secrets rotated (new Razorpay/DB credentials)

AFTER DEPLOYING:
□ Health check passes
□ Authentication flows tested
□ At least one test payment made
□ Audit logs recording (check audit_logs table)
□ Farmer ID verification flow tested
□ Scheme workflow tested end-to-end
```

### 7.2 Key Rotation

```
CREDENTIALS TO ROTATE REGULARLY:

Supabase:
- Anon key: Every 3 months
- Service role key: Every month (backend only)
- Database password: Every 6 months

Razorpay:
- API key: Every 6 months
- Webhook signature: After key rotation

Database:
- Admin password: Every 6 months
- Encryption keys: Encrypted, no rotation needed

Certificates:
- SSL/TLS: Before expiration (auto-renewed)
```

---

## 8. SECURITY RESOURCES

**Documentation:**
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [Supabase Security](https://supabase.com/docs/guides/auth)
- [India DPDP Act](https://www.meity.gov.in/divisions/department-information-technology)

**Tools:**
- [OWASP ZAP](https://www.zaproxy.org/) - Penetration testing
- [Burp Suite](https://portswigger.net/burp) - Security testing
- [npm audit](https://docs.npmjs.com/cli/v10/commands/npm-audit) - Dependency scanning

**Regular Reviews:**
- Security audit: Quarterly
- Penetration testing: Annually
- Compliance audit: Bi-annually
- Policy review: Annually
