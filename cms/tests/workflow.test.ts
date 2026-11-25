import { test } from "node:test";
import assert from "node:assert/strict";
import { canDelete, planSave, type SaveRequest } from "../src/lib/workflow.ts";
import type { Actor } from "../src/lib/permissions.ts";
import type { Entry } from "../src/lib/types.ts";

const superA: Actor = { id: "s", role: "super_admin", siteIds: ["prov", "city", "r7"] };
const admin: Actor = { id: "a", role: "admin", siteIds: ["prov"] };
const editor: Actor = { id: "e", role: "editor", siteIds: ["r7"] };
const NOW = "2026-11-25T08:00:00.000Z";
const id = () => "new-id";
const fields = { title: "Bojo River", subtitle: "Aloguinsan", summary: "s", body: "b", image_url: "" };
const req = (over: Partial<SaveRequest> = {}): SaveRequest => ({ site_id: "r7", collection_id: "dest", intent: "save_draft", fields, return_note: "", ...over });

function entry(over: Partial<Entry> = {}): Entry {
  return {
    id: "x", site_id: "r7", collection_id: "dest", ...fields, status: "draft", review_note: "", author_id: "e", last_editor_id: "e",
    published: null, published_at: null, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z", ...over,
  };
}

test("editor creates and submits on their own site", () => {
  const p = planSave(editor, req({ intent: "submit" }), null, NOW, id);
  assert.ok(p.ok);
  assert.equal(p.entry.status, "in_review");
  assert.equal(p.entry.author_id, "e");
  assert.deepEqual(p.log, ["created", "submitted"]);
});

test("editor cannot work on another site", () => {
  const p = planSave(editor, req({ site_id: "prov" }), null, NOW, id);
  assert.equal(p.ok, false);
});

test("editor cannot publish, approve or return", () => {
  for (const intent of ["publish", "approve", "return"] as const) {
    const p = planSave(editor, req({ intent, return_note: "x" }), entry({ status: "in_review" }), NOW, id);
    assert.equal(p.ok, false, intent);
  }
});

test("admin approves only on assigned sites", () => {
  const onR7 = planSave(admin, req({ intent: "approve" }), entry({ status: "in_review" }), NOW, id);
  assert.equal(onR7.ok, false);
  const onProv = planSave(admin, req({ site_id: "prov", intent: "approve" }), entry({ site_id: "prov", status: "in_review" }), NOW, id);
  assert.ok(onProv.ok);
  assert.equal(onProv.entry.status, "published");
  assert.deepEqual(onProv.entry.published, fields);
  assert.equal(onProv.entry.published_at, NOW);
});

test("approve and return need an entry in review; return needs a note", () => {
  assert.equal(planSave(superA, req({ intent: "approve" }), entry({ status: "draft" }), NOW, id).ok, false);
  assert.equal(planSave(superA, req({ intent: "return" }), entry({ status: "in_review" }), NOW, id).ok, false);
  const r = planSave(superA, req({ intent: "return", return_note: "Add a photo credit" }), entry({ status: "in_review" }), NOW, id);
  assert.ok(r.ok);
  assert.equal(r.entry.status, "returned");
  assert.equal(r.entry.review_note, "Add a photo credit");
});

test("an editor's edit to a live entry keeps the published copy", () => {
  const live = entry({ status: "published", published: { ...fields, title: "Old title" }, published_at: "2026-02-01T00:00:00Z" });
  const p = planSave(editor, req({ intent: "submit", fields: { ...fields, title: "New title" } }), live, NOW, id);
  assert.ok(p.ok);
  assert.equal(p.entry.title, "New title");
  assert.equal(p.entry.published?.title, "Old title");
  assert.equal(p.entry.published_at, "2026-02-01T00:00:00Z");
});

test("entries cannot move between sites or collections", () => {
  assert.equal(planSave(superA, req({ collection_id: "events" }), entry(), NOW, id).ok, false);
});

test("submitting clears the reviewer's note; saving a draft keeps it", () => {
  const returned = entry({ status: "returned", review_note: "Fix dates" });
  const draft = planSave(editor, req(), returned, NOW, id);
  assert.ok(draft.ok);
  assert.equal(draft.entry.review_note, "Fix dates");
  const sub = planSave(editor, req({ intent: "submit" }), returned, NOW, id);
  assert.ok(sub.ok);
  assert.equal(sub.entry.review_note, "");
});

test("delete rules", () => {
  assert.equal(canDelete(editor, entry({ status: "draft" })), true);
  assert.equal(canDelete(editor, entry({ status: "in_review" })), false);
  assert.equal(canDelete(editor, entry({ status: "draft", published_at: "2026-01-01" })), false, "draft of a live entry");
  assert.equal(canDelete(editor, entry({ site_id: "prov" })), false);
  assert.equal(canDelete(admin, entry({ site_id: "prov", status: "published", published_at: "x" })), true);
  assert.equal(canDelete(superA, entry({ status: "published", published_at: "x" })), true);
});
