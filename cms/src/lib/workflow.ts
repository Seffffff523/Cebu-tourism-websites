import { canAccessSite, canApprove, type Actor } from "./permissions.ts";
import type { Entry, EntryStatus, LogAction, PublishedCopy } from "./types.ts";

/**
 * The review workflow as pure functions. With a spreadsheet there is no database
 * to enforce rules, so every write goes through here first.
 */
export type EntryIntent = "save_draft" | "submit" | "publish" | "approve" | "return";
export type EntryFields = PublishedCopy;

const NEXT_STATUS: Record<EntryIntent, EntryStatus> = {
  save_draft: "draft",
  submit: "in_review",
  publish: "published",
  approve: "published",
  return: "returned",
};

const INTENT_LOG: Record<EntryIntent, LogAction> = {
  save_draft: "edited",
  submit: "submitted",
  publish: "published",
  approve: "approved",
  return: "returned",
};

const REVIEWER_ONLY: EntryIntent[] = ["publish", "approve", "return"];

export interface SaveRequest {
  site_id: string;
  collection_id: string;
  intent: EntryIntent;
  fields: EntryFields;
  return_note: string;
}

export type Plan = { ok: true; entry: Entry; log: LogAction[] } | { ok: false; error: string };

/** What the entry becomes when `actor` applies `req` to `existing` (null = new entry). */
export function planSave(actor: Actor, req: SaveRequest, existing: Entry | null, now: string, newId: () => string): Plan {
  const { intent, fields } = req;
  if (!canAccessSite(actor, req.site_id)) return { ok: false, error: "You don't have access to this site." };
  if (REVIEWER_ONLY.includes(intent) && !canApprove(actor, req.site_id))
    return { ok: false, error: "Only an admin for this site can publish or return entries." };
  if (existing && (existing.site_id !== req.site_id || existing.collection_id !== req.collection_id))
    return { ok: false, error: "Entries cannot move between sites or collections." };
  if ((intent === "approve" || intent === "return") && existing?.status !== "in_review")
    return { ok: false, error: "Only entries in review can be approved or returned." };
  if (intent === "return" && !req.return_note.trim()) return { ok: false, error: "Write a note so the author knows what to change." };

  const status = NEXT_STATUS[intent];
  const live = status === "published";
  const base: Entry = existing ?? {
    id: newId(),
    site_id: req.site_id,
    collection_id: req.collection_id,
    title: "",
    subtitle: "",
    summary: "",
    body: "",
    image_url: "",
    status: "draft",
    review_note: "",
    author_id: actor.id,
    last_editor_id: actor.id,
    published: null,
    published_at: null,
    created_at: now,
    updated_at: now,
  };

  const entry: Entry = {
    ...base,
    ...fields,
    status,
    review_note: intent === "return" ? req.return_note.trim() : intent === "save_draft" ? base.review_note : "",
    last_editor_id: actor.id,
    updated_at: now,
    // Only a reviewer's publish/approve changes the live copy; everyone else's edits wait.
    published: live ? { ...fields } : base.published,
    published_at: live ? now : base.published_at,
  };

  const log: LogAction[] = existing ? [INTENT_LOG[intent]] : ["created", ...(intent === "save_draft" ? [] : [INTENT_LOG[intent]])];
  return { ok: true, entry, log };
}

/** Editors may delete only drafts/returned entries that were never live; admins anything on their sites. */
export function canDelete(actor: Actor, e: Pick<Entry, "site_id" | "status" | "published_at">) {
  return (
    canApprove(actor, e.site_id) ||
    (canAccessSite(actor, e.site_id) && (e.status === "draft" || e.status === "returned") && !e.published_at)
  );
}
