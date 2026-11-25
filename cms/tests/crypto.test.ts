import { test } from "node:test";
import assert from "node:assert/strict";
import { hashPassword, passwordFingerprint, signSession, verifyPassword, verifySession } from "../src/lib/auth/crypto.ts";

const SECRET = "x".repeat(40);

test("password hashing round-trips and rejects wrong passwords", async () => {
  const h = await hashPassword("correct horse battery");
  assert.match(h, /^scrypt\$/);
  assert.equal(await verifyPassword("correct horse battery", h), true);
  assert.equal(await verifyPassword("wrong", h), false);
  assert.equal(await verifyPassword("anything", ""), false);
});

test("session tokens: valid, tampered, expired, wrong secret", () => {
  const claims = { uid: "u1", exp: Date.now() + 60_000, pwfp: passwordFingerprint("hash") };
  const t = signSession(SECRET, claims);
  assert.deepEqual(verifySession(SECRET, t), claims);
  assert.equal(verifySession(SECRET, t.replace("u1", "u2")), null);
  assert.equal(verifySession("y".repeat(40), t), null);
  assert.equal(verifySession(SECRET, signSession(SECRET, { ...claims, exp: Date.now() - 1 })), null);
  assert.equal(verifySession(SECRET, undefined), null);
});

test("changing the password changes the fingerprint (old sessions end)", () => {
  assert.notEqual(passwordFingerprint("a"), passwordFingerprint("b"));
});
