export type Role = "super_admin" | "admin" | "editor";
export type EntryStatus = "draft" | "in_review" | "published" | "returned";

export type LogAction =
  | "signed_in"
  | "signed_out"
  | "reset_requested"
  | "created"
  | "edited"
  | "submitted"
  | "returned"
  | "published"
  | "approved"
  | "deleted"
  | "invited_user"
  | "changed_access";

export interface Site {
  id: string;
  name: string;
  short_name: string;
  host: string;
  color: string;
  cover_url: string;
  logo_url: string;
  tagline: string;
  sort: number;
}

export interface Collection {
  id: string;
  label: string;
  singular: string;
  sub_label: string;
  icon: string;
  sort: number;
}

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  active: boolean;
  last_active_at: string | null;
  created_at: string;
}

export interface PublishedCopy {
  title: string;
  subtitle: string;
  summary: string;
  body: string;
  image_url: string;
}

export interface Entry {
  id: string;
  site_id: string;
  collection_id: string;
  title: string;
  subtitle: string;
  summary: string;
  body: string;
  image_url: string;
  status: EntryStatus;
  review_note: string;
  author_id: string | null;
  last_editor_id: string | null;
  /** The approved copy the public site serves; null if never published. */
  published: PublishedCopy | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Entry as lists and dashboards use it. */
export type EntrySummary = Entry;

export interface LogRow {
  id: number;
  at: string;
  user_id: string | null;
  /** Name at the time of the action, so the log reads correctly even after renames. */
  user_name: string;
  action: LogAction;
  item: string;
  collection_id: string | null;
  site_id: string | null;
  entry_id: string | null;
}
