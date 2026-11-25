"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/icon";

/** Filters the collection as you type; the query lives in the URL (?q=). */
export function SearchBox({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial);
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (value.trim()) next.set("q", value.trim());
      else next.delete("q");
      router.replace(`${path}${next.size ? `?${next}` : ""}`, { scroll: false });
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only the typed value should trigger a search
  }, [value]);

  return (
    <div className="relative max-w-[320px] flex-[1_1_220px]">
      <Icon name="magnifying-glass" size={16} className="absolute top-1/2 left-2.5 -translate-y-1/2 text-neutral-700" />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search this collection"
        aria-label="Search this collection"
        className="field min-h-[38px] py-[7px] pl-8 text-sm"
      />
    </div>
  );
}
