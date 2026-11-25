import { avatarColors, initials, STATUS_LABEL } from "@/lib/format";
import type { EntryStatus } from "@/lib/types";

export function Avatar({ id, name, size = 28 }: { id: string | null | undefined; name: string | null | undefined; size?: number }) {
  const [bg, fg] = avatarColors(id);
  return (
    <span
      title={name ?? undefined}
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold"
      style={{ width: size, height: size, background: bg, color: fg, fontSize: Math.round(size * 0.36) }}
    >
      {initials(name)}
    </span>
  );
}

const TAG: Record<EntryStatus | "new", [string, string, string]> = {
  published: ["#e9f8ff", "#004961", "transparent"],
  in_review: ["#fff1f4", "#790e3d", "transparent"],
  draft: ["#eae7e7", "#444141", "transparent"],
  new: ["#eae7e7", "#444141", "transparent"],
  returned: ["transparent", "#aa0b56", "#d6006c"],
};

export function StatusTag({ status, live }: { status: EntryStatus | "new"; live?: boolean }) {
  const [bg, fg, border] = TAG[status];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="tag" style={{ background: bg, color: fg, borderColor: border }}>
        {status === "new" ? "New" : STATUS_LABEL[status]}
      </span>
      {live && status !== "published" && (
        <span className="tag" title="The approved version stays live until this change is approved" style={{ background: "#e9f8ff", color: "#004961" }}>
          Live
        </span>
      )}
    </span>
  );
}

/** Big figure with a coloured left rule — the design's stat treatment. */
export function Stat({ value, label, color, dark }: { value: number | string; label: string; color: string; dark?: boolean }) {
  return (
    <div className="flex flex-col gap-1 pl-3" style={{ borderLeft: `3px solid ${color}` }}>
      <span className="text-[40px] leading-none font-semibold tracking-[-0.02em]">{value}</span>
      <span className={`text-[11px] tracking-[0.08em] uppercase ${dark ? "text-paper/75" : "text-neutral-700"}`}>{label}</span>
    </div>
  );
}

/** Site thumbnail with the site's colour bar along the bottom. */
export function SiteThumb({ src, color, className = "", bar = 3 }: { src: string; color: string; className?: string; bar?: number }) {
  return (
    <span className={`relative block shrink-0 overflow-hidden rounded-sm bg-surface ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src && <img src={src} alt="" className="h-full w-full object-cover" />}
      <span className="absolute inset-x-0 bottom-0" style={{ height: bar, background: color }} />
    </span>
  );
}
