import { test } from "node:test";
import assert from "node:assert/strict";
import { createStore, ConflictError } from "../src/lib/sheets/store.ts";
import { CONTENT_HEADERS, LOG_HEADERS, USER_HEADERS } from "../src/lib/sheets/schema.ts";
import type { Entry } from "../src/lib/types.ts";
import { FakeSheets } from "./fake-sheets.ts";

const header = [...CONTENT_HEADERS];
const blank = () =>
  new FakeSheets({ PROV: [header], CITY: [header], R7: [header], Users: [[...USER_HEADERS]], ActivityLog: [[...LOG_HEADERS]] });

const entry = (id: string, over: Partial<Entry> = {}): Entry => ({
  id, site_id: "prov", collection_id: "dest", title: `T-${id}`, subtitle: "", summary: "", body: "", image_url: "",
  status: "draft", review_note: "", author_id: "u1", last_editor_id: "u1", published: null, published_at: null,
  created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z", ...over,
});

test("insert, read back and update an entry in its site tab", async () => {
  const sheets = blank();
  const store = createStore(sheets, { ttlMs: 0 });
  await store.insertEntry(entry("a"));
  await store.insertEntry(entry("b", { site_id: "r7", status: "published", published: { title: "Live", subtitle: "", summary: "", body: "", image_url: "" }, published_at: "2026-02-01" }));
  assert.equal(sheets.tabs.get("PROV")!.length, 2);
  assert.equal(sheets.tabs.get("R7")!.length, 2);

  const { entries } = await store.snapshot();
  const b = entries.find((e) => e.id === "b")!;
  assert.equal(b.site_id, "r7");
  assert.equal(b.published?.title, "Live");

  await store.updateEntry("a", (e) => ({ ...e, title: "Renamed", updated_at: "2026-03-01" }));
  assert.equal((await store.snapshot()).entries.find((e) => e.id === "a")!.title, "Renamed");
});

test("updates find the right row after rows above were deleted by hand", async () => {
  const sheets = blank();
  const store = createStore(sheets, { ttlMs: 60_000 });
  for (const id of ["a", "b", "c"]) await store.insertEntry(entry(id));
  await store.snapshot(); // warm cache
  sheets.tabs.get("PROV")!.splice(1, 1); // someone deletes row "a" directly in Sheets
  await store.updateEntry("c", (e) => ({ ...e, title: "C2" }));
  const rows = sheets.tabs.get("PROV")!;
  assert.equal(rows[2][header.indexOf("title")], "C2");
  assert.equal(rows[1][header.indexOf("title")], "T-b");
});

test("columns added by hand survive an update, and column order is respected", async () => {
  const custom = ["notes", ...header.slice().reverse()];
  const sheets = new FakeSheets({ PROV: [custom], CITY: [header], R7: [header], Users: [[...USER_HEADERS]], ActivityLog: [[...LOG_HEADERS]] });
  const store = createStore(sheets, { ttlMs: 0 });
  await store.insertEntry(entry("a"));
  sheets.tabs.get("PROV")![1][0] = "keep me";
  await store.updateEntry("a", (e) => ({ ...e, title: "New" }));
  const row = sheets.tabs.get("PROV")![1];
  assert.equal(row[0], "keep me");
  assert.equal(row[custom.indexOf("title")], "New");
});

test("a stale edit is refused instead of overwriting someone else's save", async () => {
  const store = createStore(blank(), { ttlMs: 0 });
  await store.insertEntry(entry("a"));
  await store.updateEntry("a", (e) => ({ ...e, updated_at: "2026-05-05" }));
  await assert.rejects(
    store.updateEntry("a", (e) => e, { expectedUpdatedAt: "2026-01-01T00:00:00Z" }),
    ConflictError,
  );
});

test("concurrent writes are serialized and none are lost", async () => {
  const sheets = blank();
  const store = createStore(sheets, { ttlMs: 0 });
  await Promise.all(Array.from({ length: 8 }, (_, i) => store.insertEntry(entry(`e${i}`))));
  assert.equal(sheets.tabs.get("PROV")!.length, 9);
});

test("delete runs the permission check against the fresh row and logs in the same step", async () => {
  const sheets = blank();
  const store = createStore(sheets, { ttlMs: 0 });
  await store.insertEntry(entry("a", { status: "published", published_at: "x" }));
  await assert.rejects(store.deleteEntry("a", (e) => { if (e.published_at) throw new Error("live"); }), /live/);
  assert.equal(sheets.tabs.get("PROV")!.length, 2);

  await store.deleteEntry("a", () => {}, (e) => [{ at: "2026", user_id: "u1", user_name: "Ana", action: "deleted", item: e.title, site_id: "prov", collection_id: "dest", entry_id: e.id }]);
  assert.equal(sheets.tabs.get("PROV")!.length, 1);
  const log = (await store.snapshot()).log;
  assert.equal(log.length, 1);
  assert.equal(log[0].item, "T-a");
});

test("users: parsing is defensive and duplicate emails are refused", async () => {
  const sheets = new FakeSheets({
    PROV: [header], CITY: [header], R7: [header], ActivityLog: [[...LOG_HEADERS]],
    Users: [[...USER_HEADERS], ["u1", "Ana", " Ana@Cebu.gov.ph ", "god_mode", "prov, city", "TRUE", "", "", "", "", ""]],
  });
  const store = createStore(sheets, { ttlMs: 0 });
  const [u] = (await store.snapshot()).users;
  assert.equal(u.email, "ana@cebu.gov.ph");
  assert.equal(u.role, "editor", "unknown role falls back to least privilege");
  assert.deepEqual(u.site_ids, ["prov", "city"]);
  await assert.rejects(store.insertUser({ ...u, id: "u2" }), ConflictError);
});

test("reads are cached within the TTL", async () => {
  const sheets = blank();
  const store = createStore(sheets, { ttlMs: 60_000 });
  await Promise.all([store.snapshot(), store.snapshot(), store.snapshot()]);
  await store.snapshot();
  assert.equal(sheets.calls.read, 1);
});
