import Link from "next/link";

export interface SegOption {
  label: string;
  href: string;
  active: boolean;
}

/** Segmented control made of links, so every filter state is a shareable URL. */
export function Segmented({ options, dark, label }: { options: SegOption[]; dark?: boolean; label: string }) {
  return (
    <nav
      aria-label={label}
      className={`inline-flex flex-wrap overflow-hidden rounded-sm border ${dark ? "border-paper/30 bg-navy/50" : "rule"}`}
    >
      {options.map((o) => (
        <Link
          key={o.label}
          href={o.href}
          scroll={false}
          aria-current={o.active ? "true" : undefined}
          className={`px-3 py-[7px] text-[13px] no-underline ${
            dark
              ? o.active
                ? "bg-paper text-navy"
                : "text-paper hover:bg-white/10"
              : o.active
                ? "bg-accent text-paper"
                : "text-ink hover:bg-ink/[0.07]"
          }`}
        >
          {o.label}
        </Link>
      ))}
    </nav>
  );
}
