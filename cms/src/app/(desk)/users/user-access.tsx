"use client";

/* eslint-disable @next/next/no-img-element */
import { useState, useTransition } from "react";
import { resendInvite, saveUserAccess } from "@/app/actions/users";
import { Dialog } from "@/components/dialog";
import { Icon } from "@/components/icon";
import { ROLE_LABEL } from "@/lib/permissions";
import type { Role } from "@/lib/types";

interface SiteOpt {
  id: string;
  name: string;
  short_name: string;
  cover_url: string;
}
interface UserVals {
  id: string | null;
  full_name: string;
  email: string;
  role: Role;
  site_ids: string[];
  active: boolean;
}

const BLANK: UserVals = { id: null, full_name: "", email: "", role: "editor", site_ids: [], active: true };

/** "Invite user" (no `user`) or a row's "Edit" button, with the access dialog. */
export function UserAccessButton({ sites, user, selfId }: { sites: SiteOpt[]; user?: UserVals; selfId: string }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState<UserVals>(user ?? BLANK);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const editing = !!user;
  const isSelf = user?.id === selfId;
  const up = (patch: Partial<UserVals>) => {
    setV((x) => ({ ...x, ...patch }));
    setError(null);
  };

  return (
    <>
      {editing ? (
        <button
          type="button"
          onClick={() => (setV(user), setLink(null), setError(null), setOpen(true))}
          className="btn btn-secondary btn-sm"
        >
          Edit
        </button>
      ) : (
        <button type="button" onClick={() => (setV(BLANK), setLink(null), setError(null), setOpen(true))} className="btn btn-primary">
          <Icon name="user-plus" size={16} />
          Invite user
        </button>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} label={editing ? "Edit access" : "Invite a user"} width={480}>
        {link ? (
          <>
            <div className="text-[22px] leading-tight font-semibold">Sign-in link ready</div>
            <p className="m-0 text-neutral-800">
              We emailed it to <strong>{v.email}</strong>. If email isn&apos;t set up yet, send them this link yourself. It works once and
              expires in 7 days.
            </p>
            <input readOnly value={link} onFocus={(e) => e.target.select()} className="field font-mono text-xs" aria-label="Sign-in link" />
            <div className="mt-1 flex justify-end gap-2.5">
              <button type="button" className="btn btn-secondary" onClick={() => void navigator.clipboard?.writeText(link)}>
                Copy link
              </button>
              <button type="button" className="btn btn-primary" onClick={() => setOpen(false)}>
                Done
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="text-[22px] leading-tight font-semibold">{editing ? "Edit access" : "Invite a user"}</div>
            <label className="flex flex-col gap-[5px]">
              <span className="text-xs text-neutral-800">Full name</span>
              <input value={v.full_name} onChange={(e) => up({ full_name: e.target.value })} className="field" />
            </label>
            <label className="flex flex-col gap-[5px]">
              <span className="text-xs text-neutral-800">Work email</span>
              <input
                type="email"
                value={v.email}
                onChange={(e) => up({ email: e.target.value })}
                placeholder="name@cebu.gov.ph"
                readOnly={editing}
                className={`field ${editing ? "opacity-70" : ""}`}
              />
            </label>

            <div className="flex flex-col gap-[5px]">
              <span className="text-xs text-neutral-800">Role</span>
              <div role="radiogroup" aria-label="Role" className="rule inline-flex self-start overflow-hidden rounded-sm border">
                {(["editor", "admin", "super_admin"] as Role[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    role="radio"
                    aria-checked={v.role === r}
                    disabled={isSelf}
                    onClick={() => up({ role: r })}
                    className={`border-none px-[13px] py-[7px] text-[13px] ${v.role === r ? "bg-accent text-paper" : "bg-transparent text-ink hover:bg-ink/[0.07]"}`}
                  >
                    {ROLE_LABEL[r]}
                  </button>
                ))}
              </div>
            </div>

            {v.role !== "super_admin" && (
              <div className="flex flex-col gap-2">
                <span className="text-xs text-neutral-800">Assigned sites</span>
                {sites.map((s) => {
                  const on = v.site_ids.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      onClick={() => up({ site_ids: on ? v.site_ids.filter((x) => x !== s.id) : [...v.site_ids, s.id] })}
                      className="flex items-center gap-2.5 rounded-sm border p-1 text-left text-[15px] text-ink"
                      style={{ borderColor: on ? "#0088b0" : "rgba(32,30,29,0.2)", background: on ? "#e9f8ff" : "transparent" }}
                    >
                      <img src={s.cover_url} alt="" className="h-[30px] w-10 rounded-xs object-cover" />
                      <span className="flex-1">{s.name}</span>
                      <span
                        className="mr-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-xs border-[1.5px] text-paper"
                        style={{ borderColor: on ? "#0088b0" : "rgba(32,30,29,0.2)", background: on ? "#0088b0" : "transparent" }}
                      >
                        {on && <Icon name="check" size={12} />}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {editing && !isSelf && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!v.active}
                  onChange={(e) => up({ active: !e.target.checked })}
                  className="h-4 w-4 accent-[#d6006c]"
                />
                Deactivate this account (they can no longer sign in; their history stays in the log)
              </label>
            )}
            {isSelf && <p className="m-0 text-[13px] text-neutral-700">You can&apos;t change your own role. Ask another Super Admin.</p>}
            {!editing && (
              <p className="m-0 text-[13px] text-neutral-700">
                They&apos;ll get an email with a link to set a password. If Google sign-in is on, they can also use it with this address.
              </p>
            )}

            {error && (
              <p role="alert" className="m-0 text-sm text-magenta-700">
                {error}
              </p>
            )}
            <div className="mt-1 flex flex-wrap justify-end gap-2.5">
              {editing && v.active && (
                <button
                  type="button"
                  disabled={pending}
                  className="btn-link mr-auto"
                  title="For a lost password or an expired invite"
                  onClick={() =>
                    start(async () => {
                      const r = await resendInvite(user!.id!);
                      if (!r.ok) return setError(r.error);
                      if (r.inviteLink) setLink(r.inviteLink);
                    })
                  }
                >
                  New sign-in link
                </button>
              )}
              <button type="button" onClick={() => setOpen(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button
                type="button"
                disabled={pending}
                className="btn btn-primary"
                onClick={() =>
                  start(async () => {
                    const r = await saveUserAccess(v);
                    if (!r.ok) return setError(r.error);
                    if (r.inviteLink) return setLink(r.inviteLink);
                    setOpen(false);
                  })
                }
              >
                {pending ? "Saving…" : editing ? "Save access" : "Send invite"}
              </button>
            </div>
          </>
        )}
      </Dialog>
    </>
  );
}
