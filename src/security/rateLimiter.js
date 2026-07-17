// ─── CLIENT-SIDE RATE LIMITER ─────────────────────────────────────
// Token-bucket implementation stored in memory (per-session).
// Prevents brute-force on auth forms and excessive API calls.

const buckets = new Map();

/**
 * Create or retrieve a rate-limit bucket.
 * @param {string} key        Unique key (e.g. 'login', 'otp', 'api')
 * @param {number} maxTokens  Max allowed actions in the window
 * @param {number} windowMs   Window in milliseconds
 */
const getBucket = (key, maxTokens, windowMs) => {
  if (!buckets.has(key)) {
    buckets.set(key, {
      tokens: maxTokens,
      lastRefill: Date.now(),
      maxTokens,
      windowMs,
    });
  }
  const bucket = buckets.get(key);

  // Refill tokens based on elapsed time
  const now = Date.now();
  const elapsed = now - bucket.lastRefill;
  if (elapsed >= bucket.windowMs) {
    bucket.tokens = bucket.maxTokens;
    bucket.lastRefill = now;
  }

  return bucket;
};

/**
 * Attempt to consume a token from the bucket.
 * @returns {{ allowed: boolean, remaining: number, retryAfterMs: number }}
 */
export const consume = (key, maxTokens, windowMs) => {
  const bucket = getBucket(key, maxTokens, windowMs);
  if (bucket.tokens > 0) {
    bucket.tokens -= 1;
    return { allowed: true, remaining: bucket.tokens, retryAfterMs: 0 };
  }
  const retryAfterMs = bucket.windowMs - (Date.now() - bucket.lastRefill);
  return { allowed: false, remaining: 0, retryAfterMs: Math.max(0, retryAfterMs) };
};

/**
 * Pre-configured limiters:
 *  - login:  5 attempts per 5 minutes
 *  - otp:    3 requests per 10 minutes
 *  - api:    30 calls per 1 minute
 */
export const rateLimiters = {
  login: () => consume('login', 5, 5 * 60 * 1000),
  otp:   () => consume('otp',   3, 10 * 60 * 1000),
  api:   () => consume('api',  30, 60 * 1000),
};

/** Format milliseconds as human-readable "Xs" or "Xm Xs" */
export const formatRetryTime = (ms) => {
  const totalSec = Math.ceil(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return sec > 0 ? `${min}m ${sec}s` : `${min}m`;
};

/** Reset a specific bucket (e.g. after successful auth) */
export const resetBucket = (key) => {
  buckets.delete(key);
};
