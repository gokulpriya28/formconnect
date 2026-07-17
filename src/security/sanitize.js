// ─── SANITIZE & VALIDATE ─────────────────────────────────────────
// All user inputs must pass through these before DB writes or display.

/**
 * Strip HTML tags, trim whitespace, enforce max length.
 * Prevents stored XSS.
 */
export const sanitizeText = (str, maxLen = 500) => {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<[^>]*>/g, '')        // strip HTML tags
    .replace(/[<>&"'`]/g, (c) => ({ // encode remaining special chars
      '<': '&lt;', '>': '&gt;', '&': '&amp;',
      '"': '&quot;', "'": '&#x27;', '`': '&#x60;',
    }[c]))
    .trim()
    .slice(0, maxLen);
};

/**
 * Encode for safe HTML display (React JSX auto-escapes, but use for
 * any dangerouslySetInnerHTML or non-React context).
 */
export const escapeHtml = (str) => {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};

/** Email format + length check */
export const validateEmail = (email) => {
  if (typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed);
};

/**
 * Strong password policy:
 * - Min 8 chars
 * - At least 1 uppercase
 * - At least 1 lowercase
 * - At least 1 digit
 * - At least 1 special character
 */
export const validatePassword = (password) => {
  const errors = [];
  if (!password || password.length < 8) errors.push('At least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('One uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('One lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('One number');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('One special character (!@#$%^&*)');
  return { valid: errors.length === 0, errors };
};

/** Password strength score 0–4 */
export const passwordStrength = (password) => {
  let score = 0;
  if (!password) return score;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return Math.min(4, score);
};

/** Validate numeric price (₹) */
export const validatePrice = (val) => {
  const n = Number(val);
  return !isNaN(n) && n >= 0 && n <= 999999;
};

/** Validate quantity */
export const validateQty = (val) => {
  const n = Number(val);
  return Number.isInteger(n) && n >= 0 && n <= 1000000;
};

/** Allowed image MIME types */
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/** Validate uploaded file: type + size */
export const validateFile = (file) => {
  if (!file) return { valid: false, error: 'No file selected.' };
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return { valid: false, error: 'Only JPEG, PNG, WebP, or GIF images are allowed.' };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File too large. Max size is 5 MB (got ${(file.size / 1024 / 1024).toFixed(1)} MB).` };
  }
  return { valid: true, error: null };
};

/** Generate a random filename, preserving extension */
export const randomFileName = (file) => {
  const ext = file.name.split('.').pop().toLowerCase();
  const safeExt = ALLOWED_IMAGE_TYPES.has(file.type) ? ext : 'bin';
  const uuid = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${uuid}.${safeExt}`;
};

/**
 * Detect prompt injection attempts for AI inputs.
 * Returns true if content looks suspicious.
 */
const INJECTION_PATTERNS = [
  /ignore\s+(previous|prior|above|all)\s+instructions/i,
  /system\s*:/i,
  /you\s+are\s+(now|a|an)\s+/i,
  /forget\s+(everything|all|your)/i,
  /act\s+as\s+(if|a|an)/i,
  /disregard\s+/i,
  /jailbreak/i,
  /DAN\s+mode/i,
  /<\s*script/i,
  /javascript:/i,
  /data:\s*text\/html/i,
];

export const detectPromptInjection = (str) => {
  if (typeof str !== 'string') return false;
  return INJECTION_PATTERNS.some((re) => re.test(str));
};

/** Sanitize AI input: enforce length + injection check */
export const sanitizeAiInput = (str) => {
  if (typeof str !== 'string') return { safe: false, value: '' };
  const trimmed = str.trim().slice(0, 2000);
  if (detectPromptInjection(trimmed)) {
    return { safe: false, value: '', reason: 'Suspicious content detected.' };
  }
  return { safe: true, value: sanitizeText(trimmed, 2000) };
};
