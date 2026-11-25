import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { COLLECTIONS, SITES } from "@/lib/config";
import { passwordFingerprint, signSession, verifySession } from "@/lib/auth/crypto";
import type { Actor } from "@/lib/permissions";
import type { UserRecord } from "@/lib/sheets/rows";
import type { Collection, Profile, Site } from "@/lib/types";

export const SESSION_COOKIE = "td_session";
const SESSION_DAYS = 7;

export interface Session {
  actor: Actor;
  profile: Profile;
  /** Sites this person can work on, in display order. */
  sites: Site[];
  allSites: Site[];
  collections: Collection[];
}

/** The signed-in staff member. Re-checked against the Users tab on every request. */
export const getSession = cache(async (): Promise<Session | null> => {
  // Read the cookie first: it marks the page as per-request (never prerendered).
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const claims = verifySession(env.sessionSecret(), token);
  if (!claims) return null;
  const { users } = await db().snapshot();
  const u = users.find((x) => x.id === claims.uid);
  // Deactivated, deleted, or password changed since this session began → signed out.
  if (!u || !u.active || passwordFingerprint(u.password_hash) !== claims.pwfp) return null;

  const siteIds = u.role === "super_admin" ? SITES.map((s) => s.id) : u.site_ids.filter((id) => SITES.some((s) => s.id === id));
  return {
    actor: { id: u.id, role: u.role, siteIds },
    profile: toProfile(u),
    sites: SITES.filter((s) => siteIds.includes(s.id)),
    allSites: SITES,
    collections: COLLECTIONS,
  };
});

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/auth/signout");
  return session;
}

/** Sets the session cookie. Call from a server action or route handler. */
export async function startSession(u: UserRecord) {
  const exp = Date.now() + SESSION_DAYS * 86_400_000;
  (await cookies()).set(SESSION_COOKIE, signSession(env.sessionSecret(), { uid: u.id, exp, pwfp: passwordFingerprint(u.password_hash) }), {
    httpOnly: true,
    secure: env.siteUrl().startsWith("https://"),
    sameSite: "lax",
    path: "/",
    expires: new Date(exp),
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export const toProfile = (u: UserRecord): Profile => ({
  id: u.id,
  full_name: u.full_name,
  email: u.email,
  role: u.role,
  active: u.active,
  last_active_at: u.last_active_at,
  created_at: u.created_at,
});
