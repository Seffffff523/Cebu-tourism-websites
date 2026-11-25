/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { countBy, getEntry, listEntries, listStaff } from "@/lib/queries";
import { canApprove } from "@/lib/permissions";
import { canDelete } from "@/lib/workflow";
import { rel, STATUS_LABEL } from "@/lib/format";
import { contentHref } from "@/lib/links";
import type { EntryStatus } from "@/lib/types";
import { Hero } from "@/components/hero";
import { Segmented } from "@/components/segmented";
import { Avatar, StatusTag } from "@/components/bits";
import { Icon } from "@/components/icon";
import { ApproveButton } from "@/components/approve-button";
import { SearchBox } from "./search-box";
import { DeleteEntryButton } from "./delete-entry";
import { EntryEditor } from "./entry-editor";

type Params = { site: string; collection: string };
type Search = { status?: string; q?: string; entry?: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { site, collection } = await params;
  const session = await requireSession();
  const s = session.sites.find((x) => x.id === site);
  const c = session.collections.find((x) => x.id === collection);
  return { title: s && c ? `${c.label} · ${s.short_name}` : "Content" };
}

const STATUSES: (EntryStatus | "all")[] = ["all", "published", "in_review", "draft", "returned"];

export default async function ContentPage({ params, searchParams }: { params: Promise<Params>; searchParams: Promise<Search> }) {
  const [{ site: siteId, collection: collId }, sp] = await Promise.all([params, searchParams]);
  const session = await requireSession();
  const site = session.sites.find((s) => s.id === siteId);
  const coll = session.collections.find((c) => c.id === collId);
  if (!site || !coll) notFound();

  const [all, staff] = await Promise.all([listEntries(), listStaff()]);
  const { actor } = session;
  const inSite = all.filter((e) => e.site_id === site.id);
  const status = STATUSES.includes(sp.status as EntryStatus) ? (sp.status as EntryStatus | "all") : "all";
  const q = (sp.q ?? "").trim().toLowerCase();
  const rows = inSite
    .filter((e) => e.collection_id === coll.id)
    .filter((e) => status === "all" || e.status === status)
    .filter((e) => !q || `${e.title} ${e.subtitle} ${e.summary}`.toLowerCase().includes(q))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  const name = (id: string | null) => staff.find((p) => p.id === id)?.full_name ?? "—";
  const here = (extra: Search = {}) => contentHref(site.id, coll.id, { status: status === "all" ? undefined : status, q: sp.q, ...extra });

  // Editor drawer: ?entry=<id> or ?entry=new
  let editor: React.ReactNode = null;
  if (sp.entry) {
    const entry = sp.entry === "new" ? null : await getEntry(sp.entry);
    if (sp.entry === "new" || (entry && entry.site_id === site.id && entry.collection_id === coll.id)) {
      editor = (
        <EntryEditor
          key={sp.entry}
          site={{ id: site.id, short_name: site.short_name, color: site.color, host: site.host }}
          collection={{ id: coll.id, label: coll.label, singular: coll.singular, sub_label: coll.sub_label }}
          entry={entry}
          lastEditorName={entry ? name(entry.last_editor_id) : ""}
          canApprove={canApprove(actor, site.id)}
          canDelete={!!entry && canDelete(actor, entry)}
          closeHref={here()}
        />
      );
    }
  }

  return (
    <>
      <Hero
        images={[site.cover_url]}
        logo={site.logo_url}
        kicker={site.host}
        title={site.name}
        lede={`${site.tagline}. Changes go live on ${site.host} once approved.`}
        stats={[
          { label: "Live", value: inSite.filter((e) => e.published_at).length, color: "#62c5ee" },
          { label: "In review", value: countBy(inSite, "in_review"), color: "#d6006c" },
          { label: "Drafts & returned", value: countBy(inSite, "draft") + countBy(inSite, "returned"), color: "#f3f2f2" },
          { label: "Collections", value: session.collections.length, color: site.color },
        ]}
        actions={
          <>
            <a
              href={`https://${site.host}/`}
              target="_blank"
              rel="noreferrer"
              className="btn border-paper/35 px-3.5 text-paper no-underline hover:bg-white/10 hover:text-paper"
            >
              <Icon name="arrow-square-out" size={16} />
              View live site
            </a>
            <Link href={here({ entry: "new" })} scroll={false} className="btn btn-primary no-underline hover:text-paper">
              <Icon name="plus" size={16} />
              New {coll.singular}
            </Link>
          </>
        }
      />

      <div className="flex flex-col gap-[22px]">
        <nav aria-label="Collections" className="rule flex flex-wrap gap-x-6 gap-y-1 border-b">
          {session.collections.map((c) => {
            const active = c.id === coll.id;
            return (
              <Link
                key={c.id}
                href={contentHref(site.id, c.id)}
                aria-current={active ? "page" : undefined}
                className={`-mb-px flex items-center gap-[7px] border-b-2 py-[11px] text-[15px] no-underline hover:text-accent-700 ${
                  active ? "border-accent font-semibold text-accent-700" : "border-transparent text-ink"
                }`}
              >
                <Icon name={c.icon} size={18} />
                {c.label}
                <span className="text-xs font-normal text-neutral-700">{inSite.filter((e) => e.collection_id === c.id).length}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-wrap items-center gap-3.5">
          <SearchBox initial={sp.q ?? ""} />
          <Segmented
            label="Status"
            options={STATUSES.map((st) => ({
              label: st === "all" ? "All" : STATUS_LABEL[st],
              href: contentHref(site.id, coll.id, { status: st === "all" ? undefined : st, q: sp.q }),
              active: st === status,
            }))}
          />
        </div>

        {rows.length > 0 && coll.id === "media" && (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-6">
            {rows.map((e) => (
              <div key={e.id} className="flex flex-col gap-2">
                <Link href={here({ entry: e.id })} scroll={false} className="aspect-[4/3] overflow-hidden rounded-sm bg-surface" aria-label={`Edit ${e.title}`}>
                  {e.image_url && <img src={e.image_url} alt="" className="h-full w-full object-cover" />}
                </Link>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold">{e.title}</div>
                    <div className="text-xs text-neutral-700">© {e.subtitle || "—"}</div>
                  </div>
                  <StatusTag status={e.status} live={!!e.published_at} />
                </div>
              </div>
            ))}
          </div>
        )}

        {rows.length > 0 && coll.id !== "media" && (
          <div className="overflow-auto">
            <div className="min-w-[820px]">
              <div className="rule grid grid-cols-[minmax(0,2.8fr)_130px_minmax(0,1.1fr)_100px_180px] gap-3.5 border-b py-2.5 text-[11px] tracking-[0.08em] text-neutral-700 uppercase">
                <span>Entry</span>
                <span>Status</span>
                <span>Last edit</span>
                <span>Updated</span>
                <span className="text-right">Actions</span>
              </div>
              {rows.map((e) => (
                <div
                  key={e.id}
                  className="rule-soft grid grid-cols-[minmax(0,2.8fr)_130px_minmax(0,1.1fr)_100px_180px] items-center gap-3.5 border-b py-2.5 hover:bg-ink/[0.03]"
                >
                  <div className="flex min-w-0 items-center gap-3.5">
                    <img src={e.image_url || site.cover_url} alt="" className="h-[54px] w-[72px] shrink-0 rounded-sm bg-surface object-cover" />
                    <div className="min-w-0">
                      <Link href={here({ entry: e.id })} scroll={false} className="text-base font-semibold text-ink no-underline hover:text-accent-700">
                        {e.title}
                      </Link>
                      <div className="truncate text-[13px] text-neutral-700">
                        {[e.subtitle, e.summary].filter(Boolean).join(" — ")}
                      </div>
                    </div>
                  </div>
                  <span>
                    <StatusTag status={e.status} live={!!e.published_at} />
                  </span>
                  <span className="flex min-w-0 items-center gap-2 text-[13px] text-neutral-800">
                    <Avatar id={e.last_editor_id} name={name(e.last_editor_id)} size={24} />
                    <span className="truncate">{name(e.last_editor_id)}</span>
                  </span>
                  <span className="text-[13px] text-neutral-700">{rel(e.updated_at)}</span>
                  <div className="flex justify-end gap-1.5">
                    {e.status === "in_review" && canApprove(actor, site.id) && <ApproveButton id={e.id} small />}
                    <Link href={here({ entry: e.id })} scroll={false} className="btn btn-secondary btn-sm no-underline">
                      <Icon name="pencil-simple" size={14} />
                      Edit
                    </Link>
                    {canDelete(actor, e) && (
                      <DeleteEntryButton
                        entry={{ id: e.id, title: e.title, image: e.image_url || site.cover_url, live: !!e.published_at }}
                        siteHost={site.host}
                        siteName={site.short_name}
                        iconOnly
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!rows.length && <p className="m-0 text-neutral-700 italic">{q || status !== "all" ? "No entries match. Try another status or clear the search." : `No ${coll.label.toLowerCase()} yet.`}</p>}
        {actor.role === "editor" && (
          <p className="m-0 text-[13px] text-neutral-700">
            Your changes go live after an admin approves them. You can delete drafts and returned entries that have never been
            published; live entries are removed by an admin.
          </p>
        )}
      </div>

      {editor}
    </>
  );
}
