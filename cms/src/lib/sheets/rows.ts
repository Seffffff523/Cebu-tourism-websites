import type { Entry, EntryStatus, LogAction, LogRow, Profile, Role } from "../types.ts";

/** A data row read from a tab: its 1-based sheet row and cells keyed by header name. */
export interface RawRecord {
  row: number;
  cells: Record<string, string>;
}

export function parseTab(values: string[][]): { header: string[]; records: RawRecord[] } {
  const header = (values[0] ?? []).map((h) => h.trim());
  const records: RawRecord[] = [];
  for (let i = 1; i < values.length; i++) {
    const cells: Record<string, string> = {};
    header.forEach((h, c) => {
      if (h) cells[h] = values[i][c] ?? "";
    });
    if (Object.values(cells).some((v) => v !== "")) records.push({ row: i + 1, cells });
  }
  return { header, records };
}

/**
 * Cells for a row, in the tab's own column order. Starts from the existing cells
 * so columns the app doesn't know about (added by hand in Sheets) survive edits.
 */
export function toRow(header: string[], values: Record<string, string>, existing: Record<string, string> = {}) {
  return header.map((h) => values[h] ?? existing[h] ?? "");
}

// ─── entries ────────────────────────────────────────────────────────────────
const STATUSES: EntryStatus[] = ["draft", "in_review", "published", "returned"];

export function recordToEntry(siteId: string, r: RawRecord): Entry {
  const c = r.cells;
  const live = !!c.published_at;
  return {
    id: c.id,
    site_id: siteId,
    collection_id: c.collection,
    title: c.title,
    subtitle: c.subtitle ?? "",
    summary: c.summary ?? "",
    body: c.body ?? "",
    image_url: c.image_url ?? "",
    status: STATUSES.includes(c.status as EntryStatus) ? (c.status as EntryStatus) : "draft",
    review_note: c.review_note ?? "",
    author_id: c.author_id || null,
    last_editor_id: c.last_editor_id || null,
    created_at: c.created_at || c.updated_at || "",
    updated_at: c.updated_at || c.created_at || "",
    published_at: c.published_at || null,
    published: live
      ? { title: c.live_title, subtitle: c.live_subtitle ?? "", summary: c.live_summary ?? "", body: c.live_body ?? "", image_url: c.live_image_url ?? "" }
      : null,
  };
}

export function entryToCells(e: Entry): Record<string, string> {
  return {
    id: e.id,
    collection: e.collection_id,
    title: e.title,
    subtitle: e.subtitle,
    summary: e.summary,
    body: e.body,
    image_url: e.image_url,
    status: e.status,
    review_note: e.review_note,
    author_id: e.author_id ?? "",
    last_editor_id: e.last_editor_id ?? "",
    created_at: e.created_at,
    updated_at: e.updated_at,
    published_at: e.published_at ?? "",
    live_title: e.published?.title ?? "",
    live_subtitle: e.published?.subtitle ?? "",
    live_summary: e.published?.summary ?? "",
    live_body: e.published?.body ?? "",
    live_image_url: e.published?.image_url ?? "",
  };
}

// ─── users ──────────────────────────────────────────────────────────────────
export interface UserRecord extends Profile {
  site_ids: string[];
  password_hash: string;
  token_hash: string;
  token_expires: string;
}

const ROLES: Role[] = ["super_admin", "admin", "editor"];
const truthy = (v: string | undefined) => /^(true|yes|1)$/i.test((v ?? "").trim());

export function recordToUser(r: RawRecord): UserRecord {
  const c = r.cells;
  return {
    id: c.id,
    full_name: c.full_name,
    email: (c.email ?? "").trim().toLowerCase(),
    // An unknown role in the sheet falls back to the least privileged one.
    role: ROLES.includes(c.role as Role) ? (c.role as Role) : "editor",
    site_ids: (c.sites ?? "")
      .split(/[,\s]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
    active: truthy(c.active),
    last_active_at: c.last_active_at || null,
    created_at: c.created_at ?? "",
    password_hash: c.password_hash ?? "",
    token_hash: c.token_hash ?? "",
    token_expires: c.token_expires ?? "",
  };
}

export function userToCells(u: UserRecord): Record<string, string> {
  return {
    id: u.id,
    full_name: u.full_name,
    email: u.email,
    role: u.role,
    sites: u.site_ids.join(","),
    active: u.active ? "TRUE" : "FALSE",
    last_active_at: u.last_active_at ?? "",
    created_at: u.created_at,
    password_hash: u.password_hash,
    token_hash: u.token_hash,
    token_expires: u.token_expires,
  };
}

// ─── activity log ───────────────────────────────────────────────────────────
export function recordToLog(r: RawRecord): LogRow {
  const c = r.cells;
  return {
    id: r.row,
    at: c.at,
    user_id: c.user_id || null,
    user_name: c.user_name ?? "",
    action: c.action as LogAction,
    item: c.item ?? "",
    site_id: c.site_id || null,
    collection_id: c.collection_id || null,
    entry_id: c.entry_id || null,
  };
}

export function logToCells(l: Omit<LogRow, "id">): Record<string, string> {
  return {
    at: l.at,
    user_id: l.user_id ?? "",
    user_name: l.user_name,
    action: l.action,
    item: l.item,
    site_id: l.site_id ?? "",
    collection_id: l.collection_id ?? "",
    entry_id: l.entry_id ?? "",
  };
}
