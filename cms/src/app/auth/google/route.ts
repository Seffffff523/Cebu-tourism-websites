import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { OAuth2Client } from "google-auth-library";
import { env } from "@/lib/env";
import { OAUTH_STATE_COOKIE } from "@/lib/auth/sign-in";

/** Starts "Continue with Google". Only staff already in the Users tab get in. */
export async function GET() {
  const cfg = env.googleOAuth();
  if (!cfg) return NextResponse.redirect(`${env.siteUrl()}/login?e=google`);

  const state = randomBytes(24).toString("base64url");
  (await cookies()).set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: env.siteUrl().startsWith("https://"),
    sameSite: "lax",
    path: "/auth/google",
    maxAge: 600,
  });
  const client = new OAuth2Client(cfg.clientId, cfg.clientSecret, `${env.siteUrl()}/auth/google/callback`);
  const url = client.generateAuthUrl({ scope: ["openid", "email", "profile"], state, prompt: "select_account" });
  return NextResponse.redirect(url);
}
