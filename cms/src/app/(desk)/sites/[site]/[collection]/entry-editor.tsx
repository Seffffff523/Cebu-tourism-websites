"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveEntry } from "@/app/actions/entries";
import { rel } from "@/lib/format";
import type { EntryIntent } from "@/lib/workflow";
import type { Entry } from "@/lib/types";
import { StatusTag } from "@/components/bits";
import { Icon } from "@/components/icon";
import { DeleteEntryButton } from "./delete-entry";

type Fields = Pick<Entry, "title" | "subtitle" | "summary" | "body" | "image_url">;
const MAX_UPLOAD = 10 * 1024 * 1024;

export function EntryEditor({
  site,
  collection,
  entry,
  lastEditorName,
  canApprove,
  canDelete,
  closeHref,
}: {
  site: { id: string; short_name: string; color: string; host: string };
  collection: { id: string; label: string; singular: string; sub_label: string };
  entry: Entry | null;
  lastEditorName: string;
  canApprove: boolean;
  canDelete: boolean;
  closeHref: string;
}) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const [fields, setFields] = useState<Fields>({
    title: entry?.title ?? "",
    subtitle: entry?.subtitle ?? "",
    summary: entry?.summary ?? "",
    body: entry?.body ?? "",
    image_url: entry?.image_url ?? "",
  });
  const [returnNote, setReturnNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const close = () => router.push(closeHref, { scroll: false });
  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFields((f) => ({ ...f, [k]: e.target.value }));
    setError(null);
  };

  const isNew = !entry;
  const reviewing = canApprove && entry?.status === "in_review";
  const live = !!entry?.published_at;

  const commit = (intent: EntryIntent) =>
    start(async () => {
      const r = await saveEntry({
        id: entry?.id ?? null,
        expected_updated_at: entry?.updated_at ?? "",
        site_id: site.id,
        collection_id: collection.id,
        intent,
        fields,
        return_note: returnNote,
      });
      if (!r.ok) return setError(r.error);
      router.replace(closeHref, { scroll: false });
    });

  async function upload(file: File) {
    if (!file.type.startsWith("image/")) return setError("Choose an image file.");
    if (file.size > MAX_UPLOAD) return setError("Images must be 10 MB or smaller.");
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("site", site.id);
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) return setError(data.error ?? "The upload failed. Try again.");
      setFields((f) => ({ ...f, image_url: data.url! }));
    } catch {
      setError("The upload failed. Check your connection and try again.");
    } finally {
      setUploading(false);
    }
  }

  const actions: { label: string; intent: EntryIntent; primary?: boolean }[] = reviewing
    ? [
        { label: "Return to author", intent: "return" },
        { label: "Approve & publish", intent: "approve", primary: true },
      ]
    : canApprove
      ? [
          { label: "Save draft", intent: "save_draft" },
          { label: "Publish", intent: "publish", primary: true },
        ]
      : [
          { label: "Save draft", intent: "save_draft" },
          { label: "Submit for review", intent: "submit", primary: true },
        ];

  const input = "field";
  return (
    <dialog
      ref={ref}
      aria-label={isNew ? `New ${collection.singular}` : `Edit ${entry.title}`}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => e.target === ref.current && close()}
      className="m-0 ml-auto h-dvh max-h-dvh w-[min(620px,100%)] max-w-full bg-paper p-0 text-ink shadow-lg backdrop:bg-navy/55"
    >
      <div className="flex h-full flex-col">
        <div className="relative h-[190px] shrink-0" style={{ background: "repeating-linear-gradient(135deg,#eae9e9 0 8px,#e2e0e0 8px 16px)" }}>
          {fields.image_url ? (
            <img src={fields.image_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <span className="absolute top-5 left-6 font-mono text-xs text-neutral-700">cover image · paste a URL or upload below</span>
          )}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(14,26,77,0.9), rgba(14,26,77,0) 70%)" }} />
          <button
            type="button"
            onClick={close}
            title="Close"
            aria-label="Close editor"
            className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-sm border-none bg-paper/90 text-ink hover:bg-paper"
          >
            <Icon name="x" size={20} />
          </button>
          <div className="absolute inset-x-7 bottom-4 text-paper">
            <div className="kicker flex items-center gap-2 opacity-90">
              <span className="h-2 w-2" style={{ background: site.color }} />
              {site.short_name} · {collection.label}
            </div>
            <h2 className="mt-1.5 mb-0 text-[28px] leading-[1.15] text-paper">{isNew ? `New ${collection.singular}` : fields.title || "Untitled"}</h2>
          </div>
          <span className="absolute inset-x-0 bottom-0 h-1" style={{ background: site.color }} />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 px-7 pt-3.5">
          <StatusTag status={entry?.status ?? "new"} live={live} />
          <span className="text-xs text-neutral-700">
            {isNew ? `Will be added to ${site.short_name} · ${collection.label}` : `Last edit ${lastEditorName}, ${rel(entry.updated_at)}`}
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-[18px] overflow-auto px-7 pt-4 pb-6">
          {entry?.status === "returned" && entry.review_note && (
            <div className="rounded-sm bg-magenta-100 px-3.5 py-3 text-sm text-magenta-800">
              <strong>Returned by reviewer.</strong> <span className="italic">“{entry.review_note}”</span>
            </div>
          )}
          {live && !canApprove && (
            <div className="rounded-sm bg-accent-100 px-3.5 py-3 text-sm text-accent-800">
              This entry is live. Your edits are held for review; the site keeps the published version until an admin approves.
            </div>
          )}

          <Field label="Title">
            <input value={fields.title} onChange={set("title")} placeholder="e.g. Osmeña Peak" maxLength={200} className={input} />
          </Field>
          <Field label={collection.sub_label}>
            <input value={fields.subtitle} onChange={set("subtitle")} maxLength={200} className={input} />
          </Field>
          <div className="flex flex-col gap-[5px]">
            <label htmlFor="entry-image" className="text-xs text-neutral-800">
              {collection.id === "media" ? "Image" : "Cover image"}
            </label>
            <div className="flex gap-2">
              <input id="entry-image" value={fields.image_url} onChange={set("image_url")} placeholder="https://…" className={input} />
              <label className={`btn btn-secondary shrink-0 ${uploading ? "opacity-50" : ""}`}>
                <Icon name="upload-simple" size={16} />
                {uploading ? "Uploading…" : "Upload"}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void upload(f);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>
          <Field label="Summary (shown on cards)">
            <textarea value={fields.summary} onChange={set("summary")} placeholder="One or two sentences" rows={2} maxLength={600} className={`${input} resize-y leading-normal`} />
          </Field>
          <Field label="Body">
            <textarea value={fields.body} onChange={set("body")} placeholder="Full text for the page" rows={7} className={`${input} resize-y leading-normal`} />
          </Field>

          {reviewing && (
            <Field label="Note to author (required to return)">
              <textarea
                value={returnNote}
                onChange={(e) => {
                  setReturnNote(e.target.value);
                  setError(null);
                }}
                rows={3}
                placeholder="What needs to change before this can go live?"
                className={input}
              />
            </Field>
          )}
          {error && (
            <p role="alert" className="m-0 text-sm text-magenta-700">
              {error}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 bg-surface px-7 py-4">
          {canDelete && entry && (
            <DeleteEntryButton
              entry={{ id: entry.id, title: entry.title, image: entry.image_url, live }}
              siteHost={site.host}
              siteName={site.short_name}
              afterHref={closeHref}
            />
          )}
          <div className="flex-1" />
          {actions.map((a) => (
            <button
              key={a.intent}
              type="button"
              disabled={pending || uploading}
              onClick={() => commit(a.intent)}
              className={`btn ${a.primary ? "btn-primary" : "btn-secondary"}`}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-[5px]">
      <span className="text-xs text-neutral-800">{label}</span>
      {children}
    </label>
  );
}
