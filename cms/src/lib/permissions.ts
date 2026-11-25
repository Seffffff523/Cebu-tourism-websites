import type { Role } from "./types.ts";

/** Who is acting: role and the sites they may work on (all sites for a Super Admin). */
export interface Actor {
  id: string;
  role: Role;
  siteIds: string[];
}

export const ROLE_LABEL: Record<Role, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  editor: "Editor",
};

export const ROLE_DESC: Record<Role, string> = {
  super_admin: "All three sites. Approves and publishes, deletes anything, manages users, sees the full log.",
  admin: "Assigned sites. Approves, publishes and returns entries, deletes on those sites, sees their log.",
  editor: "Assigned sites. Creates and edits, submits for review, deletes unpublished drafts, sees their log.",
};

export const isSuper = (a: Actor) => a.role === "super_admin";

export const canAccessSite = (a: Actor, siteId: string) => isSuper(a) || a.siteIds.includes(siteId);

/** Can publish, approve, return — and therefore skip review — on this site. */
export const canApprove = (a: Actor, siteId: string) =>
  canAccessSite(a, siteId) && (a.role === "super_admin" || a.role === "admin");

export const canManageUsers = isSuper;

/** Log lines a person may read: everything for Super Admins, else their sites plus their own actions. */
export const canSeeLog = (a: Actor, l: { user_id: string | null; site_id: string | null }) =>
  isSuper(a) || l.user_id === a.id || (!!l.site_id && a.siteIds.includes(l.site_id));
