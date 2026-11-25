"use client";

/* eslint-disable @next/next/no-img-element */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteEntry } from "@/app/actions/entries";
import { Dialog } from "@/components/dialog";
import { Icon } from "@/components/icon";

export function DeleteEntryButton({
  entry,
  siteHost,
  siteName,
  iconOnly,
  afterHref,
}: {
  entry: { id: string; title: string; image: string; live: boolean };
  siteHost: string;
  siteName: string;
  iconOnly?: boolean;
  /** Where to go after deleting (closes the editor). */
  afterHref?: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <>
      {iconOnly ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          title="Delete"
          aria-label={`Delete ${entry.title}`}
          className="flex h-[30px] w-[30px] items-center justify-center rounded-sm border-none bg-transparent text-magenta-700 hover:bg-magenta-100"
        >
          <Icon name="trash" size={16} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 rounded-sm border-none bg-transparent px-1.5 py-2 text-sm text-magenta-700 hover:bg-magenta-100"
        >
          <Icon name="trash" size={16} />
          Delete
        </button>
      )}
      <Dialog open={open} onClose={() => setOpen(false)} label="Delete entry">
        <div className="flex items-center gap-3.5">
          {entry.image && <img src={entry.image} alt="" className="h-12 w-16 rounded-sm object-cover" />}
          <div className="text-[21px] leading-tight font-semibold">Delete “{entry.title}”?</div>
        </div>
        <p className="m-0 text-neutral-800">
          This removes the entry from {siteName}
          {entry.live ? ` and takes it off ${siteHost}` : ""}. The activity log keeps a record of who deleted it.
        </p>
        {error && (
          <p role="alert" className="m-0 text-sm text-magenta-700">
            {error}
          </p>
        )}
        <div className="mt-1.5 flex justify-end gap-2.5">
          <button type="button" onClick={() => setOpen(false)} className="btn btn-secondary">
            Cancel
          </button>
          <button
            type="button"
            disabled={pending}
            className="btn btn-danger"
            onClick={() =>
              start(async () => {
                const r = await deleteEntry(entry.id);
                if (!r.ok) return setError(r.error);
                setOpen(false);
                if (afterHref) router.replace(afterHref, { scroll: false });
              })
            }
          >
            {pending ? "Deleting…" : "Delete entry"}
          </button>
        </div>
      </Dialog>
    </>
  );
}
