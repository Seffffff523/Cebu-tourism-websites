"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { clock } from "@/lib/format";
import { logActivity, logLine } from "@/lib/activity";
import { sendEmail } from "@/lib/email";
import { endSession, getSession, startSession } from "@/lib/session";
import { hashPassword, newOneTimeToken, sha256, verifyPassword } from "@/lib/auth/crypto";
import { clearAttempts, tooManyAttempts } from "@/lib/auth/rate-limit";
import { completeSignIn } from "@/lib/auth/sign-in";

export type FormState = { error?: string; sent?: string } | undefined;

const RESET_MINUTES = 30;
// A real hash to compare against when the email is unknown, so timing doesn't reveal accounts.
const DUMMY_HASH = "scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA$" + "A".repeat(86);

const credentials = z.object({
  email: z.string().trim().toLowerCase().min(1, "Enter your work email.").pipe(z.email("Enter a valid work email.")),
  password: z.string().min(1, "Enter your password."),
});

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "local";
}

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const parsed = credentials.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { email, password } = parsed.data;

  const key = `login:${email}:${await clientIp()}`;
  if (tooManyAttempts(key)) return { error: "Too many attempts. Wait 15 minutes, or reset your password." };

  const { users } = await db().snapshot(true);
  const u = users.find((x) => x.email === email);
  const ok = await verifyPassword(password, u?.password_hash || DUMMY_HASH);
  if (!u || !ok) return { error: "That email and password don't match an account." };
  if (!u.active) return { error: "This account is deactivated. Ask a Super Admin." };

  clearAttempts(key);
  await completeSignIn(u.id);
  redirect("/");
}

export async function requestPasswordReset(_: FormState, form: FormData): Promise<FormState> {
  const email = z.email().safeParse(String(form.get("email") ?? "").trim().toLowerCase());
  if (!email.success) return { error: "Enter a valid work email." };
  if (tooManyAttempts(`reset:${email.data}`, 3, 60 * 60_000) || tooManyAttempts(`reset-ip:${await clientIp()}`, 10, 60 * 60_000))
    return { sent: email.data }; // same answer either way

  const { users } = await db().snapshot(true);
  const u = users.find((x) => x.email === email.data && x.active);
  if (u) {
    const { token, hash } = newOneTimeToken();
    await db().updateUser(
      u.id,
      (cur) => ({ ...cur, token_hash: hash, token_expires: new Date(Date.now() + RESET_MINUTES * 60_000).toISOString() }),
      (cur) => [logLine({ user_id: cur.id, user_name: cur.full_name, action: "reset_requested" })],
    );
    await sendEmail(
      u.email,
      "Reset your Tourism Desk password",
      `Someone asked to reset the password for ${u.email}.\n\nSet a new password (link expires in ${RESET_MINUTES} minutes):\n${env.siteUrl()}/reset-password?token=${token}\n\nIf this wasn't you, ignore this email.\n`,
    );
  }
  // The answer is the same whether or not the account exists.
  return { sent: email.data };
}

/** From an invite or reset link: set the password, then sign in. */
export async function setPasswordWithToken(_: FormState, form: FormData): Promise<FormState> {
  const token = String(form.get("token") ?? "");
  const password = String(form.get("password") ?? "");
  if (password.length < 10) return { error: "Use at least 10 characters." };
  if (password !== String(form.get("confirm") ?? "")) return { error: "The two passwords don't match." };

  const { users } = await db().snapshot(true);
  const hash = sha256(token);
  const u = users.find((x) => x.token_hash && x.token_hash === hash);
  if (!u || !u.active || !(Date.parse(u.token_expires) > Date.now()))
    return { error: "This link is invalid or has expired. Ask for a new one." };

  const password_hash = await hashPassword(password);
  const updated = await db().updateUser(
    u.id,
    (cur) => ({ ...cur, password_hash, token_hash: "", token_expires: "", last_active_at: new Date().toISOString() }),
    (cur) => [logLine({ user_id: cur.id, user_name: cur.full_name, action: "signed_in" })],
  );
  await startSession(updated);
  redirect("/");
}

export async function signOut() {
  const session = await getSession();
  if (session) await logActivity({ user_id: session.actor.id, user_name: session.profile.full_name, action: "signed_out" });
  await endSession();
  redirect(`/login?out=${encodeURIComponent(clock(new Date()))}`);
}
