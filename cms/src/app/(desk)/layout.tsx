import { requireSession } from "@/lib/session";
import { countBy, listEntries } from "@/lib/queries";
import { canApprove } from "@/lib/permissions";
import { Sidebar } from "./sidebar";

export default async function DeskLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const entries = await listEntries();
  const { actor, sites } = session;

  // Badge: entries this person can act on as a reviewer.
  const reviewable = entries.filter((e) => e.status === "in_review" && canApprove(actor, e.site_id)).length;
  const siteNav = sites.map((s) => {
    const es = entries.filter((e) => e.site_id === s.id);
    const rv = countBy(es, "in_review");
    return {
      id: s.id,
      name: s.short_name === "Province" ? "Cebu Province" : s.name,
      sub: `${es.length} entries${rv ? ` · ${rv} in review` : ""}`,
      cover: s.cover_url,
      color: s.color,
    };
  });

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar
        role={actor.role}
        name={session.profile.full_name}
        userId={actor.id}
        scope={actor.role === "super_admin" ? `All ${sites.length} sites` : sites.map((s) => s.short_name).join(" + ")}
        reviewBadge={reviewable}
        sites={siteNav}
      />
      <main className="min-w-0 flex-1 px-[clamp(18px,3vw,44px)] pt-7 pb-[72px]">
        <div className="flex max-w-[1280px] flex-col gap-9">{children}</div>
      </main>
    </div>
  );
}
