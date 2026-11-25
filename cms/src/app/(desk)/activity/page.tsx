import type { Metadata } from "next";
import { requireSession } from "@/lib/session";
import { listLog, listStaff } from "@/lib/queries";
import { LOG_CATEGORIES } from "@/lib/activity";
import { ROLE_LABEL } from "@/lib/permissions";
import { ACTION_LABEL, clock, dailyBars, dayLabel } from "@/lib/format";
import type { LogAction, LogRow } from "@/lib/types";
import { PageHeader } from "@/components/hero";
import { Segmented } from "@/components/segmented";
import { Avatar, Stat } from "@/components/bits";
import { Icon } from "@/components/icon";

export const metadata: Metadata = { title: "Activity log" };

const ACT_TAG: Partial<Record<LogAction, [string, string]>> = {
  created: ["#e9f8ff", "#004961"],
  edited: ["#e9f8ff", "#004961"],
  submitted: ["#fff1f4", "#790e3d"],
  returned: ["#fff1f4", "#790e3d"],
  published: ["#0088b0", "#f3f2f2"],
  approved: ["#0088b0", "#f3f2f2"],
  deleted: ["#d6006c", "#f3f2f2"],
};

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ site?: string; cat?: string }> }) {
  const sp = await searchParams;
  const session = await requireSession();
  const [log, staff] = await Promise.all([listLog(14), listStaff()]);
  const { actor, sites, collections } = session;
  const sup = actor.role === "super_admin";

  const siteF = sites.some((s) => s.id === sp.site) ? sp.site! : "all";
  const catF = sp.cat && sp.cat in LOG_CATEGORIES ? sp.cat : "All";
  const cat = LOG_CATEGORIES[catF];
  const href = (p: { site?: string; cat?: string }) => {
    const q = new URLSearchParams();
    const s = p.site ?? siteF;
    const c = p.cat ?? catF;
    if (s !== "all") q.set("site", s);
    if (c !== "All") q.set("cat", c);
    return `/activity${q.size ? `?${q}` : ""}`;
  };

  const cnt = (names: LogAction[]) => log.filter((l) => names.includes(l.action)).length;
  const filtered = log.filter((l) => (siteF === "all" || l.site_id === siteF) && (!cat || cat.includes(l.action)));

  const groups: { label: string; rows: LogRow[] }[] = [];
  for (const l of filtered) {
    const label = dayLabel(l.at);
    const g = groups.at(-1);
    if (g && g.label === label) g.rows.push(l);
    else groups.push({ label, rows: [l] });
  }

  const person = (id: string | null) => staff.find((p) => p.id === id);
  const scope = sup ? "the three sites" : sites.map((s) => s.name).join(", ");
  const bars = dailyBars(log.map((l) => l.at), 14);

  return (
    <>
      <PageHeader
        kicker="Audit"
        title="Activity log"
        lede={sup ? "Every sign-in, change, review and deletion across the three sites." : `Sign-ins, changes, reviews and deletions on ${scope}.`}
        actions={
          <a href={`/activity/export${href({}).replace("/activity", "")}`} className="btn btn-secondary no-underline">
            <Icon name="download-simple" size={16} />
            Export CSV
          </a>
        }
      />

      <div className="flex flex-col gap-8">
        <div className="flex flex-wrap items-end gap-12">
          <div className="flex flex-wrap gap-[clamp(24px,4vw,48px)]">
            <Stat label="Sign-ins · 14 days" value={cnt(["signed_in"])} color="#605d5d" />
            <Stat label="Content changes" value={cnt(LOG_CATEGORIES.Content!)} color="#0088b0" />
            <Stat label="Review actions" value={cnt(LOG_CATEGORIES.Review!)} color="#e0a419" />
            <Stat label="Deletions" value={cnt(LOG_CATEGORIES.Deletions!)} color="#d6006c" />
          </div>
          <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-1.5">
            <div className="flex h-[90px] items-end gap-1" role="img" aria-label={`Events per day, last 14 days: ${bars.map((b) => `${b.title} ${b.n}`).join(", ")}`}>
              {bars.map((b) => (
                <div
                  key={b.key}
                  title={`${b.title}: ${b.n}`}
                  className="min-h-0.5 flex-1 rounded-xs"
                  style={{ height: `${b.pct}%`, background: b.today ? "#d6006c" : "#0088b0" }}
                />
              ))}
            </div>
            <div className="flex justify-between text-[11px] text-neutral-700">
              <span>14 days ago</span>
              <span>Today</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3.5">
          <Segmented
            label="Site"
            options={[
              { label: sup ? "All sites" : "All my sites", href: href({ site: "all" }), active: siteF === "all" },
              ...sites.map((s) => ({ label: s.short_name, href: href({ site: s.id }), active: siteF === s.id })),
            ]}
          />
          <Segmented
            label="Category"
            options={Object.keys(LOG_CATEGORIES).map((k) => ({ label: k, href: href({ cat: k }), active: catF === k }))}
          />
          <span className="ml-auto flex items-center gap-1.5 text-xs text-neutral-700">
            <Icon name="lock-simple" size={16} />
            Append-only · last 14 days (export has everything)
          </span>
        </div>

        {groups.map((g) => (
          <section key={g.label} className="flex flex-col">
            <h2 className="mt-0 mb-1.5 text-[22px]">
              {g.label} <span className="text-sm font-normal text-neutral-700">· {g.rows.length} {g.rows.length === 1 ? "event" : "events"}</span>
            </h2>
            <div className="overflow-auto">
              <div className="min-w-[760px]">
                {g.rows.map((l) => {
                  const u = person(l.user_id);
                  const st = session.allSites.find((s) => s.id === l.site_id);
                  const c = collections.find((x) => x.id === l.collection_id);
                  const [bg, fg] = ACT_TAG[l.action] ?? ["#eae7e7", "#444141"];
                  const detail = c
                    ? c.label
                    : LOG_CATEGORIES.Sessions!.includes(l.action)
                      ? "Session"
                      : LOG_CATEGORIES.Users!.includes(l.action)
                        ? "Users"
                        : "";
                  return (
                    <div key={l.id} className="rule-soft grid grid-cols-[80px_minmax(0,1.2fr)_130px_minmax(0,2fr)_130px] items-center gap-3.5 border-t py-2.5">
                      <span className="text-[13px] text-neutral-700 tabular-nums">{clock(l.at)}</span>
                      <div className="flex min-w-0 items-center gap-2.5">
                        <Avatar id={l.user_id} name={l.user_name || u?.full_name} size={30} />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold">{l.user_name || u?.full_name || "Unknown"}</div>
                          <div className="text-xs text-neutral-700">{u ? ROLE_LABEL[u.role] : ""}</div>
                        </div>
                      </div>
                      <span>
                        <span className="tag" style={{ background: bg, color: fg }}>
                          {ACTION_LABEL[l.action]}
                        </span>
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm italic">{l.item || "—"}</div>
                        <div className="text-xs text-neutral-700">{detail}</div>
                      </div>
                      <span className="flex items-center gap-1.5 text-[13px] text-neutral-800">
                        <span className="h-2 w-2" style={{ background: st?.color ?? "transparent" }} />
                        {st?.short_name ?? "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        ))}
        {!groups.length && <p className="m-0 text-neutral-700 italic">No activity matches these filters.</p>}
      </div>
    </>
  );
}
