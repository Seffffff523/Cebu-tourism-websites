import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";

// ─── passwords ──────────────────────────────────────────────────────────────
// scrypt (N=2^15, r=8, p=1), stored as scrypt$N$r$p$salt$hash (base64url).
const N = 2 ** 15, R = 8, P = 1, KEYLEN = 64;

function derive(password: string, salt: Buffer, n: number, r: number, p: number) {
  return new Promise<Buffer>((resolve, reject) =>
    scrypt(password.normalize("NFKC"), salt, KEYLEN, { N: n, r, p, maxmem: 128 * n * r * 2 }, (err, key) =>
      err ? reject(err) : resolve(key),
    ),
  );
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await derive(password, salt, N, R, P);
  return ["scrypt", N, R, P, salt.toString("base64url"), key.toString("base64url")].join("$");
}

export async function verifyPassword(password: string, stored: string) {
  const [alg, n, r, p, salt, hash] = stored.split("$");
  if (alg !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const key = await derive(password, Buffer.from(salt, "base64url"), Number(n), Number(r), Number(p));
  return key.length === expected.length && timingSafeEqual(key, expected);
}

// ─── one-time tokens (invites, password resets) ─────────────────────────────
/** A random token for the email link; only its hash is stored in the sheet. */
export function newOneTimeToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: sha256(token) };
}

export const sha256 = (s: string) => createHash("sha256").update(s).digest("base64url");

// ─── session tokens ─────────────────────────────────────────────────────────
/**
 * A signed, expiring session: `uid.expires.pwfp.signature`. `pwfp` fingerprints the
 * password hash, so changing a password signs out every other session.
 */
export interface SessionClaims {
  uid: string;
  exp: number;
  pwfp: string;
}

export const passwordFingerprint = (passwordHash: string) => sha256(passwordHash || "no-password").slice(0, 12);

const sign = (secret: string, data: string) => createHmac("sha256", secret).update(data).digest("base64url");

export function signSession(secret: string, claims: SessionClaims) {
  const data = [claims.uid, claims.exp, claims.pwfp].join(".");
  return `${data}.${sign(secret, data)}`;
}

export function verifySession(secret: string, token: string | undefined, now = Date.now()): SessionClaims | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [uid, exp, pwfp, sig] = parts;
  const expected = Buffer.from(sign(secret, `${uid}.${exp}.${pwfp}`));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  if (!(Number(exp) > now)) return null;
  return { uid, exp: Number(exp), pwfp };
}
