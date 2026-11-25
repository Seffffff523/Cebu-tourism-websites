import "server-only";
import { db } from "@/lib/db";
import { logLine } from "@/lib/activity";
import { startSession } from "@/lib/session";

export const OAUTH_STATE_COOKIE = "td_oauth_state";

/**
 * Updates last-active, logs the sign-in and sets the session cookie.
 * Server-only on purpose: it must never be exported from a "use server" file,
 * where it would become callable from the browser.
 */
export async function completeSignIn(userId: string) {
  const u = await db().updateUser(
    userId,
    (cur) => ({ ...cur, last_active_at: new Date().toISOString() }),
    (cur) => [logLine({ user_id: cur.id, user_name: cur.full_name, action: "signed_in" })],
  );
  await startSession(u);
}
