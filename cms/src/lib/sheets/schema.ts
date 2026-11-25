/**
 * The spreadsheet layout. Row 1 of every tab is the header; the app finds columns
 * by header name, so columns can be reordered (or extra ones added) in Sheets.
 *
 *   PROV, CITY, R7   one tab per website — every entry of every collection
 *   Users            staff accounts (password hashes — keep this tab protected)
 *   ActivityLog      append-only audit trail
 */
export const CONTENT_HEADERS = [
  "id",
  "collection",
  "title",
  "subtitle",
  "summary",
  "body",
  "image_url",
  "status",
  "review_note",
  "author_id",
  "last_editor_id",
  "created_at",
  "updated_at",
  "published_at",
  // The approved copy the public site serves. Edits to a live entry wait for
  // review in the columns above while these keep the published version.
  "live_title",
  "live_subtitle",
  "live_summary",
  "live_body",
  "live_image_url",
] as const;

export const USER_HEADERS = [
  "id",
  "full_name",
  "email",
  "role",
  "sites",
  "active",
  "last_active_at",
  "created_at",
  "password_hash",
  "token_hash",
  "token_expires",
] as const;

export const LOG_HEADERS = ["at", "user_id", "user_name", "action", "item", "site_id", "collection_id", "entry_id"] as const;

export const USERS_TAB = "Users";
export const LOG_TAB = "ActivityLog";

/** Google Sheets holds at most 50,000 characters in one cell. */
export const MAX_CELL = 50_000;
