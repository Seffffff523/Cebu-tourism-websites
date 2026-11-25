import "server-only";

/**
 * In-memory limiter for sign-in and reset requests (per server process).
 * Enough to stop password guessing against one account; put the app behind a
 * reverse proxy with its own limits if it is exposed widely.
 */
const hits = new Map<string, number[]>();

export function tooManyAttempts(key: string, max = 5, windowMs = 15 * 60_000) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 10_000) for (const [k, v] of hits) if (v.every((t) => now - t >= windowMs)) hits.delete(k);
  return recent.length > max;
}

export function clearAttempts(key: string) {
  hits.delete(key);
}
