/* eslint-disable @next/next/no-img-element */
import type { Site } from "@/lib/types";

/** Sign-in layout: one photo panel per site on navy, the masthead form on paper. */
export function AuthShell({ sites, dateline, children }: { sites: Site[]; dateline: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-wrap bg-navy">
      <div className="flex min-h-[320px] flex-[1_1_560px] gap-[3px] md:min-h-[520px]">
        {sites.map((p) => (
          <div key={p.id} className="relative min-w-0 flex-[1_1_0] overflow-hidden transition-[flex-grow] duration-400 hover:grow-[1.7]">
            <img src={p.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(to top, rgba(14,26,77,0.95) 0%, rgba(14,26,77,0.55) 40%, rgba(14,26,77,0.1) 75%)" }}
            />
            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2.5 px-6 py-7 text-paper">
              <div className="flex h-11 items-center">
                {p.logo_url && <img src={p.logo_url} alt="" className="max-h-11 max-w-[120px] object-contain" />}
              </div>
              <div className="h-[3px] w-7" style={{ background: p.color }} />
              <div className="text-2xl leading-tight font-semibold">{p.name}</div>
              <div className="italic opacity-90">{p.tagline}</div>
              <div className="text-xs opacity-75">{p.host}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex min-w-[300px] flex-[0_1_480px] flex-col gap-9 bg-paper px-[clamp(24px,4vw,56px)] py-9">
        <div className="flex flex-col gap-[3px]">
          <div className="h-[3px] bg-ink" />
          <div className="h-px bg-ink" />
          <div className="flex flex-wrap justify-between gap-2 py-[7px] text-[11px] tracking-[0.08em] uppercase">
            <span className="font-semibold">The Tourism Desk</span>
            <span>{dateline}</span>
          </div>
          <div className="h-px bg-ink" />
        </div>
        <div className="flex max-w-[380px] flex-1 flex-col justify-center gap-[22px]">{children}</div>
      </div>
    </div>
  );
}
