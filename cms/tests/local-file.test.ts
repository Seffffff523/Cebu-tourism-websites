import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { LocalFileSheets } from "../src/lib/sheets/local-file.ts";
import { createStore } from "../src/lib/sheets/store.ts";
import { DEMO_USERS } from "../src/lib/sheets/demo.ts";
import { verifyPassword } from "../src/lib/auth/crypto.ts";

test("local demo file seeds working logins and content, and persists writes", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "td-"));
  const file = path.join(dir, "local-sheet.json");
  try {
    const store = createStore(new LocalFileSheets(file), { ttlMs: 0 });
    const { users, entries } = await store.snapshot();
    assert.equal(users.length, DEMO_USERS.length);
    for (const d of DEMO_USERS) {
      const u = users.find((x) => x.email === d.email)!;
      assert.equal(u.role, d.role);
      assert.equal(await verifyPassword(d.password, u.password_hash), true, d.email);
    }
    assert.ok(entries.some((e) => e.site_id === "prov" && e.status === "in_review"));
    assert.ok(entries.some((e) => e.site_id === "r7" && e.status === "returned"));

    const first = entries[0];
    await store.updateEntry(first.id, (e) => ({ ...e, title: "Persisted" }));
    const reopened = createStore(new LocalFileSheets(file), { ttlMs: 0 });
    assert.equal((await reopened.snapshot()).entries.find((e) => e.id === first.id)?.title, "Persisted");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
