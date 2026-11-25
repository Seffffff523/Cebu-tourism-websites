/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/session";
import { countBy, listEntries, listLog, listStaff } from "@/lib/queries";
import { canApprove } from "@/lib/permissions";
import { LOG_CATEGORIES } from "@/lib/activity";
import { ACTION_VERB, dailyBars, dateline, greeting, rel, withinDays } from "@/lib/format";
import { contentHref, entryHref } from "@/lib/links";
import type { EntryStatus, EntrySummary, LogRow } from "@/lib/types";
import { Hero } from "@/components/hero";
import { Segmented } from "@/components/segmented";
import { Avatar, SiteThumb, StatusTag } from "@/components/bits";
import { Icon } from "@/components/icon";
import { ApproveButton } from "@/components/approve-button";

export const metadata: Metadata = { title: "Dashboard" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  const ledger = view === "ledger";
  const session = await requireSession();
  const [entries, log, staff] = await Promise.all([listEntries(), listLog(14), listStaff()]);
  const { actor, sites, collections } = session;

  const name = (id: string | null) => staff.find((p) => p.id === id)?.full_name ?? "—";
  const site = (id: string | null) => sites.find((s) => s.id === id) ?? session.allSites.find((s) => s.id === id);
  const coll = (id: string | null) => collections.find((c) => c.id === id);

  const reviewer = actor.role !== "editor";
  const reviewN = entries.filter((e) => e.status === "in_review" && canApprove(actor, e.site_id)).length;
  const scopeText =
    actor.role === "super_admin"
      ? "all three sites"
      : sites.length > 1
        ? `${sites.slice(0, -1).map((s) => s.name).join(", ")} and ${sites.at(-1)!.name}`
        : (sites[0]?.name ?? "no sites yet");
  const sessions = LOG_CATEGORIES.Sessions!;
  const changes = log.filter((l) => !sessions.includes(l.action));
  const weekChanges = changes.filter((l) => withinDays(l.at, 7)).length;

  const byTime = (a: EntrySummary[]) => [...a].sort((x, y) => y.updated_at.localeCompare(x.updated_at));
  const mine = (e: EntrySummary) => e.author_id === actor.id;
  const sections: { title: string; status: EntryStatus; empty: string; items: EntrySummary[] }[] = reviewer
    ? [
        { title: "Awaiting your review", status: "in_review", empty: "Nothing waiting. All caught up.", items: entries.filter((e) => e.status === "in_review" && canApprove(actor, e.site_id)) },
        { title: "Returned, awaiting changes", status: "returned", empty: "No entries are with authors.", items: entries.filter((e) => e.status === "returned") },
      ]
    : [
        { title: "Returned to you", status: "returned", empty: "Nothing returned. Good work.", items: entries.filter((e) => e.status === "returned" && mine(e)) },
        { title: "Waiting on review", status: "in_review", empty: "Nothing submitted yet.", items: entries.filter((e) => e.status === "in_review" && mine(e)) },
        { title: "Your drafts", status: "draft", empty: "No drafts.", items: entries.filter((e) => e.status === "draft" && mine(e)) },
      ];

  const item = (e: EntrySummary) => {
    const s = site(e.site_id);
    const verb = { in_review: "Submitted by ", returned: "Returned by ", draft: "Last edited by ", published: "Updated by " }[e.status];
    const who = e.status === "returned" ? e.last_editor_id : e.author_id;
    return {
      e,
      kicker: `${s?.short_name} · ${coll(e.collection_id)?.label}`,
      color: s?.color ?? "#605d5d",
      meta: `${verb}${name(who)} · ${rel(e.updated_at)}`,
      byWhen: `${name(who)}, ${rel(e.updated_at)}`,
      canApprove: e.status === "in_review" && canApprove(actor, e.site_id),
    };
  };

  const recent = log.slice(0, 6).map((l) => describeLog(l, name, site, coll));

  return (
    <>
      <Hero
        images={sites.map((s) => s.cover_url)}
        kicker={dateline()}
        title={`${greeting()}, ${session.profile.full_name.split(" ")[0]}.`}
        lede={
          reviewer
            ? reviewN
              ? `${reviewN} ${reviewN === 1 ? "entry is" : "entries are"} waiting for your review across ${scopeText}.`
              : `Nothing is waiting for review across ${scopeText}.`
            : `You edit ${scopeText}. Changes go live once an admin approves them.`
        }
        stats={[
          { label: "Live entries", value: entries.filter((e) => e.published_at).length, color: "#62c5ee" },
          { label: "In review", value: countBy(entries, "in_review"), color: "#d6006c" },
          { label: "Drafts & returned", value: countBy(entries, "draft") + countBy(entries, "returned"), color: "#f3f2f2" },
          { label: "Changes this week", value: weekChanges, color: "#e0a419" },
        ]}
        actions={
          <Segmented
            dark
            label="Dashboard layout"
            options={[
              { label: "A · Front page", href: "/", active: !ledger },
              { label: "B · Ledger", href: "/?view=ledger", active: ledger },
            ]}
          />
        }
      />

      {!ledger ? (
        <div className="flex flex-col gap-12">
          <div className="flex flex-wrap items-start gap-12">
            <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-10">
              {sections.map((sec, i) => {
                const hot = i === 0 && sec.items.length > 0;
                return (
                  <section key={sec.title} className="flex flex-col">
                    <div className="mb-2 flex items-baseline gap-2.5">
                      <h2 className="m-0 text-[22px]">{sec.title}</h2>
                      <span className={`rounded-xs px-2 py-px text-[13px] ${hot ? "bg-magenta text-paper" : "bg-neutral-200 text-neutral-800"}`}>
                        {sec.items.length}
                      </span>
                    </div>
                    {byTime(sec.items).map((e) => {
                      const it = item(e);
                      return (
                        <article key={e.id} className="rule-soft flex items-start gap-4 border-t py-3.5">
                          <Link href={entryHref(e)} aria-label={`Open ${e.title}`} className="aspect-[4/3] w-28 shrink-0">
                            <SiteThumb src={e.image_url} color={it.color} className="h-full w-full" />
                          </Link>
                          <div className="flex min-w-0 flex-1 flex-col gap-1">
                            <div className="kicker text-neutral-700">{it.kicker}</div>
                            <Link href={entryHref(e)} className="text-xl leading-tight font-semibold tracking-[-0.01em] text-ink no-underline hover:text-accent-700">
                              {e.title}
                            </Link>
                            <div className="text-[13px] text-neutral-700">{it.meta}</div>
                            {e.review_note && <p className="mt-0.5 mb-0 text-sm text-magenta-800 italic">“{e.review_note}”</p>}
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1.5">
                            {it.canApprove && <ApproveButton id={e.id} />}
                            <Link href={entryHref(e)} className="btn btn-secondary px-3 py-1.5 text-[13px] no-underline">
                              {it.canApprove ? "Review" : "Open"}
                            </Link>
                          </div>
                        </article>
                      );
                    })}
                    {!sec.items.length && <p className="rule-soft m-0 border-t py-4 text-neutral-700 italic">{sec.empty}</p>}
                  </section>
                );
              })}
            </div>

            <div className="flex min-w-[280px] flex-[0_1_360px] flex-col gap-9">
              <WeekChart times={changes.map((l) => l.at)} />
              <LogFeed lines={recent} />
            </div>
          </div>

          <section className="flex flex-col gap-4">
            <h2 className="m-0 text-[22px]">{actor.role === "super_admin" ? "The three sites" : sites.length > 1 ? "Your sites" : "Your site"}</h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6">
              {sites.map((s) => {
                const es = entries.filter((e) => e.site_id === s.id);
                return (
                  <div key={s.id} className="flex flex-col overflow-hidden rounded-sm bg-surface">
                    <div className="relative aspect-[16/8] bg-navy">
                      <img src={s.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(14,26,77,0.85), rgba(14,26,77,0) 60%)" }} />
                      {s.logo_url && <img src={s.logo_url} alt="" className="absolute top-3.5 left-4 h-[34px] max-w-[110px] object-contain" />}
                      <div className="absolute inset-x-4 bottom-3 text-paper">
                        <div className="text-[19px] leading-tight font-semibold">{s.name}</div>
                        <div className="text-xs opacity-80">{s.host}</div>
                      </div>
                      <span className="absolute inset-x-0 bottom-0 h-1" style={{ background: s.color }} />
                    </div>
                    <div className="flex items-end gap-[22px] p-4">
                      <Figure value={es.filter((e) => e.published_at).length} label="live" />
                      <Figure value={countBy(es, "in_review")} label="in review" color="#aa0b56" />
                      <Figure value={countBy(es, "draft") + countBy(es, "returned")} label="drafts" color="#605d5d" />
                      <Link href={`/sites/${s.id}`} className="btn btn-secondary ml-auto px-3 py-[7px] text-[13px] no-underline">
                        Open <Icon name="arrow-right" size={14} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="m-0 text-[22px]">Recently published</h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-6">
              {entries
                .filter((e) => e.published_at)
                .sort((a, b) => b.published_at!.localeCompare(a.published_at!))
                .slice(0, 4)
                .map((e) => (
                  <Link key={e.id} href={entryHref(e)} className="flex flex-col gap-2 text-ink no-underline hover:text-accent-700">
                    <SiteThumb src={e.image_url} color={site(e.site_id)?.color ?? "#605d5d"} className="aspect-[4/3] w-full" />
                    <span className="kicker text-neutral-700">
                      {site(e.site_id)?.short_name} · {coll(e.collection_id)?.label}
                    </span>
                    <span className="text-lg leading-tight font-semibold">{e.title}</span>
                    <span className="text-[13px] text-neutral-700">Published {rel(e.published_at)}</span>
                  </Link>
                ))}
              {!entries.some((e) => e.published_at) && <p className="m-0 text-neutral-700 italic">Nothing published yet.</p>}
            </div>
          </section>
        </div>
      ) : (
        <div className="flex flex-col gap-11">
          <section className="flex flex-col gap-2.5">
            <h2 className="m-0 text-[22px]">Content by site</h2>
            <div className="overflow-auto">
              <div className="min-w-[620px]">
                <MatrixRow sites={sites.length} head>
                  <span>Collection</span>
                  {sites.map((s) => (
                    <span key={s.id} className="flex items-center gap-2">
                      <img src={s.cover_url} alt="" className="h-[22px] w-[22px] rounded-sm object-cover" style={{ borderBottom: `2px solid ${s.color}` }} />
                      {s.short_name}
                    </span>
                  ))}
                </MatrixRow>
                {(() => {
                  const max = Math.max(1, ...collections.flatMap((c) => sites.map((s) => entries.filter((e) => e.site_id === s.id && e.collection_id === c.id).length)));
                  return collections.map((c) => (
                    <MatrixRow key={c.id} sites={sites.length}>
                      <span className="flex items-center gap-2.5 font-semibold">
                        <Icon name={c.icon} size={18} className="text-accent-700" />
                        {c.label}
                      </span>
                      {sites.map((s) => {
                        const es = entries.filter((e) => e.site_id === s.id && e.collection_id === c.id);
                        const pend = countBy(es, "in_review");
                        return (
                          <Link key={s.id} href={contentHref(s.id, c.id)} className="flex items-center gap-2.5 text-ink no-underline hover:text-accent-700">
                            <span className="block h-1.5 w-[60px] overflow-hidden rounded-xs bg-neutral-200">
                              <span className="block h-full" style={{ width: `${Math.round((es.length / max) * 100)}%`, background: s.color }} />
                            </span>
                            <span>{es.filter((e) => e.published_at).length} live</span>
                            {!!pend && <span className="rounded-xs bg-magenta-100 px-[7px] py-px text-xs text-magenta-800">{pend} pending</span>}
                          </Link>
                        );
                      })}
                    </MatrixRow>
                  ));
                })()}
              </div>
            </div>
          </section>

          <div className="flex flex-wrap items-start gap-12">
            <section className="flex min-w-0 flex-[1_1_560px] flex-col gap-2.5">
              <h2 className="m-0 text-[22px]">Work queue</h2>
              <div className="overflow-auto">
                <div className="min-w-[600px]">
                  <div className="rule grid grid-cols-[minmax(0,2.2fr)_110px_minmax(0,1fr)_150px] gap-3.5 border-b py-2.5 text-[11px] tracking-[0.08em] text-neutral-700 uppercase">
                    <span>Entry</span>
                    <span>Stage</span>
                    <span>By</span>
                    <span className="text-right">Action</span>
                  </div>
                  {sections.flatMap((sec) => byTime(sec.items)).map((e) => {
                    const it = item(e);
                    return (
                      <div key={e.id} className="rule-soft grid grid-cols-[minmax(0,2.2fr)_110px_minmax(0,1fr)_150px] items-center gap-3.5 border-b py-2.5">
                        <div className="flex min-w-0 items-center gap-3">
                          <SiteThumb src={e.image_url} color={it.color} className="h-[42px] w-14" />
                          <div className="min-w-0">
                            <div className="truncate font-semibold">{e.title}</div>
                            <div className="text-xs text-neutral-700">{it.kicker}</div>
                          </div>
                        </div>
                        <span>
                          <StatusTag status={e.status} />
                        </span>
                        <span className="text-[13px] text-neutral-800">{it.byWhen}</span>
                        <div className="flex justify-end gap-1.5">
                          {it.canApprove && <ApproveButton id={e.id} small />}
                          <Link href={entryHref(e)} className="btn btn-secondary btn-sm no-underline">
                            Open
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                  {!sections.some((s) => s.items.length) && <p className="m-0 py-4 text-neutral-700 italic">Nothing in the queue.</p>}
                </div>
              </div>
            </section>
            <div className="flex min-w-[260px] flex-[0_1_340px] flex-col">
              <LogFeed lines={recent} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Figure({ value, label, color }: { value: number; label: string; color?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-3xl leading-none font-semibold" style={{ color }}>
        {value}
      </span>
      <span className="text-xs text-neutral-700">{label}</span>
    </div>
  );
}

function MatrixRow({ sites, head, children }: { sites: number; head?: boolean; children: React.ReactNode }) {
  return (
    <div
      className={`grid items-center gap-4 border-b ${head ? "rule py-2.5 text-[11px] tracking-[0.08em] text-neutral-700 uppercase" : "rule-soft py-[11px]"}`}
      style={{ gridTemplateColumns: `minmax(180px,1.2fr) repeat(${sites}, minmax(0,1fr))` }}
    >
      {children}
    </div>
  );
}

function WeekChart({ times }: { times: string[] }) {
  const bars = dailyBars(times, 7);
  const total = bars.reduce((a, b) => a + b.n, 0);
  return (
    <section className="flex flex-col gap-3.5">
      <div className="flex items-baseline justify-between">
        <h2 className="m-0 text-[22px]">This week</h2>
        <span className="text-[13px] text-neutral-700">{total} changes</span>
      </div>
      <div className="flex h-[120px] items-end gap-2" role="img" aria-label={`Changes per day this week: ${bars.map((b) => `${b.title} ${b.n}`).join(", ")}`}>
        {bars.map((b) => (
          <div key={b.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[11px] text-neutral-700">{b.n}</span>
            <div className="min-h-0.5 w-full rounded-xs" style={{ height: `${b.pct}%`, background: b.today ? "#d6006c" : "#0088b0" }} />
          </div>
        ))}
      </div>
      <div className="-mt-1.5 flex gap-2">
        {bars.map((b) => (
          <span key={b.key} className="flex-1 text-center text-[11px] text-neutral-700">
            {b.day}
          </span>
        ))}
      </div>
    </section>
  );
}

type LogLineView = ReturnType<typeof describeLog>;

function describeLog(
  l: LogRow,
  name: (id: string | null) => string,
  site: (id: string | null) => { short_name: string } | undefined,
  coll: (id: string | null) => { label: string } | undefined,
) {
  const s = site(l.site_id);
  const c = coll(l.collection_id);
  return {
    id: l.id,
    userId: l.user_id,
    userName: l.user_name || name(l.user_id),
    verb: ACTION_VERB[l.action],
    item: l.item,
    where: s ? `${s.short_name}${c ? ` · ${c.label}` : ""} · ` : "",
    when: rel(l.at),
  };
}

function LogFeed({ lines }: { lines: LogLineView[] }) {
  return (
    <section className="flex flex-col gap-0.5">
      <div className="mb-1.5 flex items-baseline justify-between">
        <h2 className="m-0 text-[22px]">From the log</h2>
        <Link href="/activity" className="btn-link no-underline">
          Full log →
        </Link>
      </div>
      {lines.map((r) => (
        <div key={r.id} className="flex items-start gap-2.5 py-2">
          <Avatar id={r.userId} name={r.userName} />
          <div className="min-w-0 text-sm leading-[1.45]">
            <span className="font-semibold">{r.userName}</span> <span className="text-neutral-800">{r.verb}</span>{" "}
            <span className="italic">{r.item}</span>
            <div className="text-xs text-neutral-700">
              {r.where}
              {r.when}
            </div>
          </div>
        </div>
      ))}
      {!lines.length && <p className="m-0 py-2 text-neutral-700 italic">No activity yet.</p>}
    </section>
  );
}
