const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;

/**
 * Simple sliding-window in-memory rate limiter, keyed by ip hash.
 * Single long-running container — module-level state is correct here.
 */
export function createRateLimiter(windowMs = RATE_LIMIT_WINDOW_MS, max = RATE_LIMIT_MAX) {
  const timestamps = new Map<string, number[]>();
  return function isRateLimited(key: string): boolean {
    const now = Date.now();
    const recent = (timestamps.get(key) ?? []).filter((t) => now - t < windowMs);
    if (recent.length >= max) {
      timestamps.set(key, recent);
      return true;
    }
    recent.push(now);
    timestamps.set(key, recent);
    return false;
  };
}
