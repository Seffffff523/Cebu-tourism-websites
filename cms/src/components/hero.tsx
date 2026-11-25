/* eslint-disable @next/next/no-img-element */
import { Stat } from "@/components/bits";

/** Navy photo banner at the top of the dashboard and each site's content page. */
export function Hero({
  images,
  kicker,
  logo,
  title,
  lede,
  stats,
  actions,
}: {
  images: string[];
  kicker: string;
  logo?: string;
  title: string;
  lede: string;
  stats: { label: string; value: number; color: string }[];
  actions?: React.ReactNode;
}) {
  return (
    <section className="relative flex min-h-[300px] overflow-hidden rounded-md bg-navy text-paper">
      <div className="absolute inset-0 flex gap-0.5">
        {images.map((src, i) => (
          <img key={i} src={src} alt="" className="h-full min-w-0 flex-[1_1_0] object-cover" />
        ))}
      </div>
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(90deg, rgba(14,26,77,0.94) 0%, rgba(14,26,77,0.78) 42%, rgba(14,26,77,0.2) 100%)" }}
      />
      <div className="relative flex flex-1 flex-col justify-between gap-7 px-[clamp(22px,3vw,40px)] py-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-[620px]">
            <div className="kicker flex items-center gap-2.5 text-accent-300">
              {logo && <img src={logo} alt="" className="h-[30px] max-w-[90px] object-contain" />}
              <span>{kicker}</span>
            </div>
            <h1 className="mt-2.5 mb-0 text-[clamp(32px,4vw,46px)] leading-[1.05] tracking-[-0.02em] text-paper">{title}</h1>
            <p className="mt-2.5 mb-0 text-base text-pretty text-paper/88">{lede}</p>
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
        </div>
        <div className="flex flex-wrap gap-[clamp(24px,4vw,56px)]">
          {stats.map((k) => (
            <Stat key={k.label} {...k} dark />
          ))}
        </div>
      </div>
    </section>
  );
}

export function PageHeader({ kicker, title, lede, actions }: { kicker: string; title: string; lede: string; actions?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-6 pt-2">
      <div className="max-w-[720px] min-w-0">
        <div className="kicker text-accent-700">{kicker}</div>
        <h1 className="mt-1.5 mb-0 text-[clamp(32px,4vw,44px)] leading-[1.08] tracking-[-0.02em]">{title}</h1>
        <p className="mt-2 mb-0 text-base text-pretty text-neutral-800">{lede}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </header>
  );
}
