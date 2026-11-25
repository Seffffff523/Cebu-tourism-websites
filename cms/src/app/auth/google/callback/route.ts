import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { OAuth2Client } from "google-auth-library";
import { timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import { db } from "@/lib/db";
import { completeSignIn, OAUTH_STATE_COOKIE } from "@/lib/auth/sign-in";

export async function GET(request: NextRequest) {
  const origin = env.siteUrl();
  const cfg = env.googleOAuth();
  const p = request.nextUrl.searchParams;
  const jar = await cookies();
  const expected = jar.get(OAUTH_STATE_COOKIE)?.value ?? "";
  jar.delete({ name: OAUTH_STATE_COOKIE, path: "/auth/google" });

  const state = p.get("state") ?? "";
  const code = p.get("code");
  const stateOk = expected.length > 0 && state.length === expected.length && timingSafeEqual(Buffer.from(state), Buffer.from(expected));
  if (!cfg || !code || !stateOk) return NextResponse.redirect(`${origin}/login?e=google`);

  try {
    const client = new OAuth2Client(cfg.clientId, cfg.clientSecret, `${origin}/auth/google/callback`);
    const { tokens } = await client.getToken(code);
    const ticket = await client.verifyIdToken({ idToken: tokens.id_token ?? "", audience: cfg.clientId });
    const claims = ticket.getPayload();
    if (!claims?.email || !claims.email_verified) return NextResponse.redirect(`${origin}/login?e=google`);

    const { users } = await db().snapshot(true);
    const u = users.find((x) => x.email === claims.email!.toLowerCase());
    if (!u || !u.active) return NextResponse.redirect(`${origin}/login?e=no-access`);

    await completeSignIn(u.id);
    return NextResponse.redirect(`${origin}/`);
  } catch (err) {
    console.error("[google sign-in]", err);
    return NextResponse.redirect(`${origin}/login?e=google`);
  }
}
