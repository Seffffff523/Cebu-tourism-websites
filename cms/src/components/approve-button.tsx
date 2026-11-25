"use client";

import { useState, useTransition } from "react";
import { approveEntry } from "@/app/actions/entries";
import { Icon } from "@/components/icon";

export function ApproveButton({ id, small }: { id: string; small?: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await approveEntry(id);
            setError(r.ok ? null : r.error);
          })
        }
        className={`btn btn-primary ${small ? "btn-sm" : "px-3 py-1.5 text-[13px]"}`}
      >
        {!small && <Icon name="check" size={15} />}
        {pending ? "Approving…" : "Approve"}
      </button>
      {error && (
        <span role="alert" className="max-w-[180px] text-right text-xs text-magenta-700">
          {error}
        </span>
      )}
    </span>
  );
}
