"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icon";
import { Avatar } from "@/components/bits";
import { ROLE_LABEL } from "@/lib/permissions";
import type { Role } from "@/lib/types";
import { SignOutButton } from "./sign-out";

interface SiteNav {
  id: string;
  name: string;
  sub: string;
  cover: string;
  color: string;
}

export function Sidebar(props: {
  role: Role;
  name: string;
  userId: string;
  scope: string;
  reviewBadge: number;
  sites: SiteNav[];
}) {
  const path = usePathname();
  const nav = [
    { href: "/", label: "Dashboard", icon: "squares-four", active: path === "/", badge: props.reviewBadge },
    { href: `/sites/${props.sites[0]?.id ?? ""}`, label: "Content", icon: "files", active: path.startsWith("/sites") },
    { href: "/activity", label: "Activity log", icon: "clock-counter-clockwise", active: path.startsWith("/activity") },
    ...(props.role === "super_admin"
      ? [{ href: "/users", label: "Users & roles", icon: "users-three", active: path.startsWith("/users") }]
      : []),
  ];

  return (
    <aside className="flex shrink-0 flex-col gap-[26px] overflow-auto bg-navy px-[18px] pt-[26px] pb-[18px] text-paper md:sticky md:top-0 md:h-screen md:w-64">
      <div className="flex flex-col gap-1.5 px-1.5">
        <span className="text-[21px] font-semibold tracking-[-0.015em]">The Tourism Desk</span>
        <span className="self-start rounded-xs bg-accent-400/16 px-2 py-0.5 text-[10px] tracking-[0.12em] text-accent-300 uppercase">
          {ROLE_LABEL[props.role]}
        </span>
      </div>

      <nav aria-label="Main" className="flex flex-col gap-0.5">
        {nav.map((n) => (
          <Link
            key={n.label}
            href={n.href}
            aria-current={n.active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-sm px-2.5 py-[9px] text-[15px] text-paper no-underline hover:bg-white/8 ${
              n.active ? "bg-white/12 font-semibold" : ""
            }`}
          >
            <Icon name={n.icon} size={20} color={n.active ? "#62c5ee" : "rgba(243,242,242,0.8)"} />
            <span className="flex-1">{n.label}</span>
            {!!n.badge && (
              <span className="rounded-xs bg-magenta px-2 py-px text-[11px] font-semibold text-paper" title="Waiting for your review">
                {n.badge}
              </span>
            )}
          </Link>
        ))}
      </nav>

      <div className="flex flex-col gap-1.5">
        <div className="px-2.5 text-[11px] tracking-[0.1em] text-paper/60 uppercase">
          {props.role === "super_admin" ? "Sites" : "Your sites"}
        </div>
        {props.sites.map((s) => {
          const active = path.startsWith(`/sites/${s.id}`);
          return (
            <Link
              key={s.id}
              href={`/sites/${s.id}`}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-2.5 rounded-sm px-2.5 py-[7px] text-paper no-underline hover:bg-white/8 ${active ? "bg-white/12" : ""}`}
            >
              <span className="relative h-[38px] w-[38px] shrink-0 overflow-hidden rounded-sm">
                <img src={s.cover} alt="" className="h-full w-full object-cover" />
                <span className="absolute inset-x-0 bottom-0 h-[3px]" style={{ background: s.color }} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col leading-[1.3]">
                <span className="truncate text-sm font-semibold">{s.name}</span>
                <span className="truncate text-[11px] text-paper/60">{s.sub}</span>
              </span>
            </Link>
          );
        })}
      </div>

      <div className="flex-1" />
      <div className="flex items-center gap-2.5 px-1">
        <Avatar id={props.userId} name={props.name} size={38} />
        <div className="flex min-w-0 flex-1 flex-col leading-[1.3]">
          <span className="truncate text-sm font-semibold">{props.name}</span>
          <span className="truncate text-xs text-paper/65">{props.scope}</span>
        </div>
        <SignOutButton />
      </div>
    </aside>
  );
}
