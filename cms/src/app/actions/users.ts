"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { canManageUsers } from "@/lib/permissions";
import { logLine } from "@/lib/activity";
import { sendEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { SITES } from "@/lib/config";
import { newOneTimeToken } from "@/lib/auth/crypto";
import { ConflictError, NotFoundError } from "@/lib/sheets/store";
import { firstError, userAccessInput, type UserAccessInput } from "@/lib/validation";

export type UserActionResult = { ok: true; inviteLink?: string } | { ok: false; error: string };

const INVITE_DAYS = 7;

/** Invite a new staff member, or change one's role, sites or active flag. Super Admin only. */
export async function saveUserAccess(raw: UserAccessInput): Promise<UserActionResult> {
  const session = await requireSession();
  if (!canManageUsers(session.actor)) return { ok: false, error: "Only a Super Admin can manage users." };
  const parsed = userAccessInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const v = parsed.data;

  const siteIds = v.role === "super_admin" ? [] : v.site_ids.filter((id) => SITES.some((s) => s.id === id));
  if (v.id === session.actor.id && (v.role !== "super_admin" || !v.active))
    return { ok: false, error: "You can't remove your own Super Admin access. Ask another Super Admin." };

  const me = { user_id: session.actor.id, user_name: session.profile.full_name };
  try {
    if (v.id) {
      await db().updateUser(
        v.id,
        (cur) => ({ ...cur, full_name: v.full_name, role: v.role, site_ids: siteIds, active: v.active }),
        (u) => [logLine({ ...me, action: "changed_access", item: u.full_name, site_id: siteIds.length === 1 ? siteIds[0] : null })],
      );
      revalidatePath("/", "layout");
      return { ok: true };
    }

    const { token, hash } = newOneTimeToken();
    const now = new Date().toISOString();
    await db().insertUser(
      {
        id: randomUUID(),
        full_name: v.full_name,
        email: v.email,
        role: v.role,
        site_ids: siteIds,
        active: true,
        last_active_at: null,
        created_at: now,
        password_hash: "",
        token_hash: hash,
        token_expires: new Date(Date.now() + INVITE_DAYS * 86_400_000).toISOString(),
      },
      (u) => [logLine({ ...me, action: "invited_user", item: u.full_name, site_id: siteIds.length === 1 ? siteIds[0] : null })],
    );
    const link = `${env.siteUrl()}/reset-password?token=${token}`;
    await sendEmail(
      v.email,
      "You're invited to the Tourism Desk",
      `${session.profile.full_name} invited you to the Tourism Desk, the CMS for the Cebu tourism websites.\n\nSet your password (link valid for ${INVITE_DAYS} days):\n${link}\n`,
    );
    revalidatePath("/", "layout");
    // Shown to the Super Admin too, so they can pass it on if email isn't set up.
    return { ok: true, inviteLink: link };
  } catch (err) {
    if (err instanceof ConflictError || err instanceof NotFoundError) return { ok: false, error: err.message };
    console.error("[users]", err);
    return { ok: false, error: "The change couldn't be saved to the spreadsheet. Try again in a moment." };
  }
}

/** A fresh set-password link for someone who lost theirs or whose invite expired. */
export async function resendInvite(userId: string): Promise<UserActionResult> {
  const session = await requireSession();
  if (!canManageUsers(session.actor)) return { ok: false, error: "Only a Super Admin can manage users." };
  const { token, hash } = newOneTimeToken();
  try {
    const u = await db().updateUser(userId, (cur) => ({
      ...cur,
      token_hash: hash,
      token_expires: new Date(Date.now() + INVITE_DAYS * 86_400_000).toISOString(),
    }));
    const link = `${env.siteUrl()}/reset-password?token=${token}`;
    await sendEmail(u.email, "Your Tourism Desk sign-in link", `Set your password (link valid for ${INVITE_DAYS} days):\n${link}\n`);
    return { ok: true, inviteLink: link };
  } catch (err) {
    if (err instanceof NotFoundError) return { ok: false, error: err.message };
    console.error("[users]", err);
    return { ok: false, error: "Couldn't create a new link. Try again in a moment." };
  }
}
