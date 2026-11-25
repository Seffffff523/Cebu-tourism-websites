"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSession, type Session } from "@/lib/session";
import { canApprove } from "@/lib/permissions";
import { logLine } from "@/lib/activity";
import { sendEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { siteById } from "@/lib/config";
import { ConflictError, NotFoundError } from "@/lib/sheets/store";
import { firstError, saveEntryInput, type SaveEntryInput } from "@/lib/validation";
import { canDelete, planSave, type EntryIntent } from "@/lib/workflow";
import type { Entry, LogAction } from "@/lib/types";

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

class Refused extends Error {}

export async function saveEntry(raw: SaveEntryInput): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = saveEntryInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const { id, expected_updated_at, ...req } = parsed.data;
  if (!session.collections.some((c) => c.id === req.collection_id)) return { ok: false, error: "Unknown collection." };

  const now = new Date().toISOString();
  const logFor = (e: Entry, actions: LogAction[]) =>
    actions.map((action) =>
      logLine({ user_id: session.actor.id, user_name: session.profile.full_name, action, item: e.title, site_id: e.site_id, collection_id: e.collection_id, entry_id: e.id }),
    );

  try {
    let saved: Entry;
    if (!id) {
      const plan = planSave(session.actor, req, null, now, randomUUID);
      if (!plan.ok) return plan;
      saved = await db().insertEntry(plan.entry, (e) => logFor(e, plan.log));
    } else {
      // The plan is made inside the write step, against the row as it is in the sheet right now.
      let actions: LogAction[] = [];
      saved = await db().updateEntry(
        id,
        (current) => {
          const plan = planSave(session.actor, req, current, now, randomUUID);
          if (!plan.ok) throw new Refused(plan.error);
          actions = plan.log;
          return plan.entry;
        },
        { expectedUpdatedAt: expected_updated_at || undefined, log: (e) => logFor(e, actions) },
      );
    }
    await notify(session, req.intent, saved, req.return_note);
    revalidatePath("/", "layout");
    return { ok: true, id: saved.id };
  } catch (err) {
    return failure(err);
  }
}

/** One-click approve from the dashboard and lists: publishes the entry as submitted. */
export async function approveEntry(id: string): Promise<ActionResult> {
  const session = await requireSession();
  const now = new Date().toISOString();
  try {
    const saved = await db().updateEntry(
      id,
      (current) => {
        const { title, subtitle, summary, body, image_url } = current;
        const plan = planSave(
          session.actor,
          { site_id: current.site_id, collection_id: current.collection_id, intent: "approve", fields: { title, subtitle, summary, body, image_url }, return_note: "" },
          current,
          now,
          randomUUID,
        );
        if (!plan.ok) throw new Refused(plan.error);
        return plan.entry;
      },
      {
        log: (e) => [
          logLine({ user_id: session.actor.id, user_name: session.profile.full_name, action: "approved", item: e.title, site_id: e.site_id, collection_id: e.collection_id, entry_id: e.id }),
        ],
      },
    );
    await notify(session, "approve", saved);
    revalidatePath("/", "layout");
    return { ok: true, id };
  } catch (err) {
    return failure(err);
  }
}

export async function deleteEntry(id: string): Promise<ActionResult> {
  const session = await requireSession();
  try {
    await db().deleteEntry(
      id,
      (current) => {
        if (!canDelete(session.actor, current))
          throw new Refused("Live entries can only be removed by an admin for this site.");
      },
      (e) => [
        logLine({ user_id: session.actor.id, user_name: session.profile.full_name, action: "deleted", item: e.title, site_id: e.site_id, collection_id: e.collection_id, entry_id: e.id }),
      ],
    );
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return failure(err);
  }
}

function failure(err: unknown): ActionResult {
  if (err instanceof Refused || err instanceof ConflictError || err instanceof NotFoundError) return { ok: false, error: err.message };
  console.error("[entries]", err);
  return { ok: false, error: "The change couldn't be saved to the spreadsheet. Try again in a moment." };
}

/** Workflow email: submissions go to the site's reviewers, decisions go back to the author. */
async function notify(session: Session, intent: EntryIntent, e: Entry, note = "") {
  if (intent === "save_draft" || intent === "publish") return;
  const site = siteById(e.site_id);
  const link = `${env.siteUrl()}/sites/${e.site_id}/${e.collection_id}?entry=${e.id}`;
  const me = session.profile.full_name;
  const { users } = await db().snapshot();

  if (intent === "submit") {
    const to = users
      .filter((u) => u.active && u.id !== session.actor.id && canApprove({ id: u.id, role: u.role, siteIds: u.site_ids }, e.site_id))
      .map((u) => u.email);
    await sendEmail(to, `For review: ${e.title}`, `${me} submitted “${e.title}” on ${site?.name} for review.\n\nReview it: ${link}\n`);
    return;
  }
  const author = users.find((u) => u.id === e.author_id);
  if (!author || author.id === session.actor.id || !author.active) return;
  if (intent === "approve")
    await sendEmail(author.email, `Published: ${e.title}`, `${me} approved “${e.title}”. It is now live on ${site?.host}.\n\n${link}\n`);
  if (intent === "return")
    await sendEmail(author.email, `Returned: ${e.title}`, `${me} returned “${e.title}” with a note:\n\n“${note}”\n\nOpen it: ${link}\n`);
}
