// ─── CLIENT-SIDE EVENT LOGGER ─────────────────────────────────────
// Writes structured security audit events to the Supabase audit_logs table.
// Does NOT log passwords, tokens, or other secrets.

import { supabase } from '../../supabaseClient.js';

export const LOG_EVENTS = {
  LOGIN_SUCCESS:    'LOGIN_SUCCESS',
  LOGIN_FAILED:     'LOGIN_FAILED',
  LOGOUT:           'LOGOUT',
  SIGNUP:           'SIGNUP',
  PASSWORD_RESET:   'PASSWORD_RESET',
  MFA_ENROLLED:     'MFA_ENROLLED',
  ROLE_SWITCH:      'ROLE_SWITCH',
  PRODUCT_CREATE:   'PRODUCT_CREATE',
  PRODUCT_DELETE:   'PRODUCT_DELETE',
  ORDER_PLACE:      'ORDER_PLACE',
  ADMIN_ACTION:     'ADMIN_ACTION',
  FILE_UPLOAD:      'FILE_UPLOAD',
  SUSPICIOUS:       'SUSPICIOUS_ACTIVITY',
  RATE_LIMITED:     'RATE_LIMITED',
  CONSENT_GIVEN:    'CONSENT_GIVEN',
  ACCOUNT_DELETE:   'ACCOUNT_DELETE',
};

// In-memory write queue + rate limit: max 20 writes/min
let writeCount = 0;
let windowStart = Date.now();
const MAX_WRITES_PER_MIN = 20;

const canWrite = () => {
  const now = Date.now();
  if (now - windowStart > 60000) {
    writeCount = 0;
    windowStart = now;
  }
  if (writeCount >= MAX_WRITES_PER_MIN) return false;
  writeCount++;
  return true;
};

/**
 * Log a security event to Supabase audit_logs table.
 * @param {string} eventType  One of LOG_EVENTS values
 * @param {object} payload    Additional context (no secrets)
 * @param {string} userId     Optional user UUID
 */
export const logEvent = async (eventType, payload = {}, userId = null) => {
  if (!supabase) return; // silently skip if Supabase not configured
  if (!canWrite()) return; // rate limit guard

  // Scrub any accidental secret fields
  const safe = { ...payload };
  delete safe.password;
  delete safe.token;
  delete safe.access_token;
  delete safe.refresh_token;
  delete safe.secret;

  const entry = {
    event_type: eventType,
    user_id: userId,
    payload: safe,
    created_at: new Date().toISOString(),
    // user_agent is safe to log (browser fingerprinting for suspicious activity)
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 250) : 'unknown',
  };

  try {
    await supabase.from('audit_logs').insert([entry]);
  } catch {
    // Silently fail — logging must never break the main app flow
  }
};

/** Convenience: log failed login with masked email */
export const logLoginFailed = (email) =>
  logEvent(LOG_EVENTS.LOGIN_FAILED, {
    email_domain: email?.split('@')[1] ?? 'unknown',
  });

/** Convenience: log suspicious activity alert */
export const logSuspicious = (reason, userId) =>
  logEvent(LOG_EVENTS.SUSPICIOUS, { reason }, userId);
