import type { EntryStatus, LogAction } from "@/lib/types";

// Dates are shown in Philippine time regardless of where the server runs.
const TZ = "Asia/Manila";

const dayKey = (t: Date) => t.toLocaleDateString("en-CA", { timeZone: TZ });

export const clock = (iso: string | Date) =>
  new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: TZ });

export function dayLabel(iso: string | Date, now = new Date()) {
  const t = new Date(iso);
  if (dayKey(t) === dayKey(now)) return "Today";
  if (dayKey(t) === dayKey(new Date(now.getTime() - 86_400_000))) return "Yesterday";
  return t.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: TZ });
}

export function rel(iso: string | null | undefined, now = new Date()) {
  if (!iso) return "—";
  const m = Math.round((now.getTime() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const d = dayLabel(iso, now);
  if (d === "Today") return clock(iso);
  if (d === "Yesterday") return "yesterday";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: TZ });
}

export const withinDays = (iso: string, days: number, now = new Date()) =>
  now.getTime() - new Date(iso).getTime() < days * 86_400_000;

export const dateline = (now = new Date()) =>
  now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: TZ });

export function greeting(now = new Date()) {
  const h = Number(now.toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: TZ }));
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

/** Counts per day for the last `days` days, oldest first. */
export function dailyBars(times: string[], days: number, now = new Date()) {
  const out: { key: string; n: number; day: string; title: string }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const t = new Date(now.getTime() - i * 86_400_000);
    out.push({
      key: dayKey(t),
      n: 0,
      day: t.toLocaleDateString("en-GB", { weekday: "short", timeZone: TZ }).slice(0, 2),
      title: t.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: TZ }),
    });
  }
  const idx = new Map(out.map((o, i) => [o.key, i]));
  for (const at of times) {
    const i = idx.get(dayKey(new Date(at)));
    if (i !== undefined) out[i].n++;
  }
  const max = Math.max(1, ...out.map((o) => o.n));
  return out.map((o, i) => ({ ...o, pct: Math.round((o.n / max) * 100), today: i === out.length - 1 }));
}

export const initials = (name: string | null | undefined) =>
  (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

const AVATARS: [string, string][] = [
  ["#0088b0", "#f3f2f2"],
  ["#d6006c", "#f3f2f2"],
  ["#037291", "#f3f2f2"],
  ["#e0a419", "#201e1d"],
  ["#0e1a4d", "#f3f2f2"],
  ["#605d5d", "#f3f2f2"],
];
/** Stable avatar colours from the user id. */
export function avatarColors(id: string | null | undefined): [string, string] {
  if (!id) return AVATARS[5];
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATARS[h % AVATARS.length];
}

export const STATUS_LABEL: Record<EntryStatus, string> = {
  draft: "Draft",
  in_review: "In review",
  published: "Published",
  returned: "Returned",
};

export const ACTION_LABEL: Record<LogAction, string> = {
  signed_in: "Signed in",
  signed_out: "Signed out",
  reset_requested: "Reset requested",
  created: "Created",
  edited: "Edited",
  submitted: "Submitted",
  returned: "Returned",
  published: "Published",
  approved: "Approved",
  deleted: "Deleted",
  invited_user: "Invited user",
  changed_access: "Changed access",
};

export const ACTION_VERB: Record<LogAction, string> = {
  signed_in: "signed in",
  signed_out: "signed out",
  reset_requested: "requested a password reset",
  created: "created",
  edited: "edited",
  submitted: "submitted",
  returned: "returned",
  published: "published",
  approved: "approved",
  deleted: "deleted",
  invited_user: "invited",
  changed_access: "changed access for",
};
