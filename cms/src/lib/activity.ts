import "server-only";
import { db } from "@/lib/db";
import type { LogAction, LogRow } from "@/lib/types";

export type LogLine = Omit<LogRow, "id" | "at" | "item" | "site_id" | "collection_id" | "entry_id"> &
  Partial<Pick<LogRow, "item" | "site_id" | "collection_id" | "entry_id">>;

export function logLine(l: LogLine, at = new Date().toISOString()): Omit<LogRow, "id"> {
  return {
    at,
    user_id: l.user_id,
    user_name: l.user_name,
    action: l.action,
    item: l.item ?? "",
    site_id: l.site_id ?? null,
    collection_id: l.collection_id ?? null,
    entry_id: l.entry_id ?? null,
  };
}

/** Appends standalone lines (sign-ins etc.). Failures are reported, never thrown. */
export async function logActivity(lines: LogLine | LogLine[]) {
  try {
    await db().appendLog((Array.isArray(lines) ? lines : [lines]).map((l) => logLine(l)));
  } catch (err) {
    console.error("[activity_log] append failed:", err);
  }
}

export const LOG_CATEGORIES: Record<string, LogAction[] | null> = {
  All: null,
  Sessions: ["signed_in", "signed_out", "reset_requested"],
  Content: ["created", "edited"],
  Review: ["submitted", "returned", "approved", "published"],
  Deletions: ["deleted"],
  Users: ["invited_user", "changed_access"],
};
