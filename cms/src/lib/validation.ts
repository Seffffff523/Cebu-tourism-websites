import { z } from "zod";
import { MAX_CELL } from "@/lib/sheets/schema";

const imageUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((v) => v === "" || /^https:\/\//i.test(v) || v.startsWith("/uploads/"), "Use an https:// image URL, or upload one.");

export const entryFields = z.object({
  title: z.string().trim().min(1, "Add a title first.").max(200, "Keep the title under 200 characters."),
  subtitle: z.string().trim().max(200),
  summary: z.string().trim().max(600, "Keep the summary under 600 characters."),
  body: z.string().max(MAX_CELL - 1000, "The body is too long for one spreadsheet cell (about 49,000 characters)."),
  image_url: imageUrl,
});

// Ids are UUIDs when the CMS creates a row, but rows added by hand may use anything short.
const rowId = z.string().trim().min(1).max(100);

export const saveEntryInput = z.object({
  id: rowId.nullable(),
  /** The entry's updated_at when the editor opened it — guards against overwriting someone else's save. */
  expected_updated_at: z.string().max(40).default(""),
  site_id: z.string().min(1),
  collection_id: z.string().min(1),
  intent: z.enum(["save_draft", "submit", "publish", "approve", "return"]),
  fields: entryFields,
  return_note: z.string().trim().max(2000).default(""),
});
export type SaveEntryInput = z.input<typeof saveEntryInput>;

export const userAccessInput = z
  .object({
    id: rowId.nullable(),
    full_name: z.string().trim().min(1, "Name and email are required.").max(120),
    email: z.email("Enter a valid work email.").trim().toLowerCase(),
    role: z.enum(["super_admin", "admin", "editor"]),
    site_ids: z.array(z.string()).default([]),
    active: z.boolean().default(true),
  })
  .refine((v) => v.role === "super_admin" || v.site_ids.length > 0, {
    message: "Assign at least one site.",
    path: ["site_ids"],
  });
export type UserAccessInput = z.input<typeof userAccessInput>;

export const firstError = (e: z.ZodError) => e.issues[0]?.message ?? "Check the form and try again.";
