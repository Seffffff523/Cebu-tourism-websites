import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { canAccessSite, canSeeLog } from "@/lib/permissions";
import { requireSession } from "@/lib/session";
import { toProfile } from "@/lib/session";
import type { Entry, LogRow, Profile } from "@/lib/types";

/** Entries on the sites the signed-in person can work on. */
export const listEntries = cache(async (): Promise<Entry[]> => {
  const { actor } = await requireSession();
  const { entries } = await db().snapshot();
  return entries.filter((e) => canAccessSite(actor, e.site_id)).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
});

export async function getEntry(id: string): Promise<Entry | null> {
  return (await listEntries()).find((e) => e.id === id) ?? null;
}

/** Log lines this person may see, newest first, within `days`. */
export const listLog = cache(async (days = 14): Promise<LogRow[]> => {
  const { actor } = await requireSession();
  const { log } = await db().snapshot();
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  return log.filter((l) => l.at >= since && canSeeLog(actor, l));
});

export interface StaffMember extends Profile {
  site_ids: string[];
}

/** Everyone on staff (names for avatars and the log). Never includes password or token fields. */
export const listStaff = cache(async (): Promise<StaffMember[]> => {
  await requireSession();
  const { users } = await db().snapshot();
  return users.map((u) => ({ ...toProfile(u), site_ids: u.site_ids })).sort((a, b) => a.full_name.localeCompare(b.full_name));
});

export const countBy = <T extends { status: string }>(rows: T[], status: string) => rows.filter((r) => r.status === status).length;
