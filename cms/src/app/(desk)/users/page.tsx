/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { listStaff } from "@/lib/queries";
import { canManageUsers, ROLE_DESC, ROLE_LABEL } from "@/lib/permissions";
import { rel } from "@/lib/format";
import type { Role } from "@/lib/types";
import { PageHeader } from "@/components/hero";
import { Avatar } from "@/components/bits";
import { UserAccessButton } from "./user-access";

export const metadata: Metadata = { title: "Users & roles" };

const ROLE_COLOR: Record<Role, string> = { super_admin: "#0088b0", admin: "#e0a419", editor: "#d6006c" };
const ROLE_TAG: Record<Role, [string, string]> = {
  super_admin: ["#e9f8ff", "#004961"],
  admin: ["#fdf3dc", "#6b4a00"],
  editor: ["#fff1f4", "#790e3d"],
};

export default async function UsersPage() {
  const session = await requireSession();
  if (!canManageUsers(session.actor)) notFound();
  const staff = await listStaff();
  const sites = session.allSites.map((s) => ({ id: s.id, name: s.name, short_name: s.short_name, cover_url: s.cover_url }));

  return (
    <>
      <PageHeader
        kicker="Administration"
        title="Users & roles"
        lede="A role decides the dashboard and what a person can change. Admins and Editors work only on the sites assigned to them."
        actions={<UserAccessButton sites={sites} selfId={session.actor.id} />}
      />

      <div className="flex flex-col gap-9">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6">
          {(["super_admin", "admin", "editor"] as Role[]).map((r) => {
            const people = staff.filter((p) => p.role === r && p.active);
            return (
              <div key={r} className="flex flex-col gap-3 rounded-sm bg-surface p-5" style={{ borderTop: `4px solid ${ROLE_COLOR[r]}` }}>
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="m-0 text-[21px]">{ROLE_LABEL[r]}</h3>
                  <span className="text-[32px] leading-none font-semibold">{people.length}</span>
                </div>
                <p className="m-0 text-sm text-neutral-800">{ROLE_DESC[r]}</p>
                <div className="flex">
                  {people.map((p) => (
                    <span key={p.id} className="-mr-1.5 rounded-full border-2 border-surface">
                      <Avatar id={p.id} name={p.full_name} size={30} />
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="overflow-auto">
          <div className="min-w-[760px]">
            <div className="rule grid grid-cols-[minmax(0,1.8fr)_120px_minmax(0,1.5fr)_120px_90px] gap-3.5 border-b py-2.5 text-[11px] tracking-[0.08em] text-neutral-700 uppercase">
              <span>User</span>
              <span>Role</span>
              <span>Sites</span>
              <span>Last active</span>
              <span className="text-right">Access</span>
            </div>
            {staff.map((u) => {
              const [bg, fg] = ROLE_TAG[u.role];
              const userSites = u.role === "super_admin" ? session.allSites : session.allSites.filter((s) => u.site_ids.includes(s.id));
              return (
                <div
                  key={u.id}
                  className={`rule-soft grid grid-cols-[minmax(0,1.8fr)_120px_minmax(0,1.5fr)_120px_90px] items-center gap-3.5 border-b py-3 ${u.active ? "" : "opacity-55"}`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar id={u.id} name={u.full_name} size={38} />
                    <div className="min-w-0">
                      <div className="font-semibold">{u.full_name}</div>
                      <div className="truncate text-[13px] text-neutral-700">{u.email}</div>
                    </div>
                  </div>
                  <span>
                    <span className="tag" style={{ background: bg, color: fg }}>
                      {u.active ? ROLE_LABEL[u.role] : "Deactivated"}
                    </span>
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {userSites.map((s) => (
                      <span key={s.id} className="flex items-center gap-1.5 rounded-xs bg-surface py-0.5 pr-2 pl-0.5 text-[13px] text-neutral-800">
                        <img src={s.cover_url} alt="" className="h-5 w-5 rounded-xs object-cover" />
                        {s.short_name}
                      </span>
                    ))}
                  </div>
                  <span className="text-[13px] text-neutral-700">{u.last_active_at ? rel(u.last_active_at) : "Invite pending"}</span>
                  <div className="flex justify-end">
                    <UserAccessButton
                      sites={sites}
                      selfId={session.actor.id}
                      user={{ id: u.id, full_name: u.full_name, email: u.email, role: u.role, site_ids: u.site_ids, active: u.active }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
