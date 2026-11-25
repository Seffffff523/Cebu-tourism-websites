// Prepares the Google Spreadsheet the CMS uses. Safe to run again: it only adds what's missing.
//
//   npm run sheet:setup                                   tabs, headers, protection
//   npm run sheet:setup -- --admin "Ana Cruz <ana@cebu.gov.ph>"   + first Super Admin (prints a set-password link)
//   npm run sheet:setup -- --demo                         + 4 demo logins (one per role) and sample content (empty tabs only)
//
// Reads .env.local (GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, APP_URL).
import { randomUUID } from "node:crypto";
import { GoogleSheets } from "../src/lib/sheets/api.ts";
import { CONTENT_HEADERS, LOG_HEADERS, LOG_TAB, USER_HEADERS, USERS_TAB } from "../src/lib/sheets/schema.ts";
import { entryToCells, parseTab, recordToUser, toRow, userToCells, type UserRecord } from "../src/lib/sheets/rows.ts";
import { SITES } from "../src/lib/config.ts";
import { hashPassword, newOneTimeToken } from "../src/lib/auth/crypto.ts";
import { DEMO_AUTHOR, DEMO_USERS, demoEntries } from "../src/lib/sheets/demo.ts";

const need = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`Set ${k} in .env.local`);
  return v;
};
const api = new GoogleSheets({
  spreadsheetId: need("GOOGLE_SHEET_ID"),
  clientEmail: need("GOOGLE_SERVICE_ACCOUNT_EMAIL"),
  privateKey: need("GOOGLE_PRIVATE_KEY"),
});
const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
const args = process.argv.slice(2);
const adminArg = args.includes("--admin") ? args[args.indexOf("--admin") + 1] : null;
const demo = args.includes("--demo");

const TABS: [string, readonly string[]][] = [
  ...SITES.map((s) => [s.tab, CONTENT_HEADERS] as [string, readonly string[]]),
  [USERS_TAB, USER_HEADERS],
  [LOG_TAB, LOG_HEADERS],
];

// 1. Tabs
const existing = await api.tabIds(true);
const missing = TABS.filter(([t]) => !existing.has(t));
await api.batchUpdate(
  missing.map(([title]) => ({ addSheet: { properties: { title, gridProperties: { frozenRowCount: 1 } } } })),
);
if (missing.length) console.log(`Created tabs: ${missing.map(([t]) => t).join(", ")}`);
const ids = await api.tabIds(true);

// 2. Header rows (adds any missing columns at the end; never reorders yours)
const current = await api.readTabs(TABS.map(([t]) => t));
for (const [i, [tab, headers]] of TABS.entries()) {
  const have = (current[i][0] ?? []).map((h) => h.trim());
  const add = headers.filter((h) => !have.includes(h));
  if (add.length) {
    await api.writeRow(tab, 1, [...have, ...add]);
    console.log(`${tab}: added columns ${add.join(", ")}`);
  }
}
await api.batchUpdate(
  TABS.map(([tab]) => ({
    repeatCell: {
      range: { sheetId: ids.get(tab), startRowIndex: 0, endRowIndex: 1 },
      cell: { userEnteredFormat: { textFormat: { bold: true } } },
      fields: "userEnteredFormat.textFormat.bold",
    },
  })),
);

// 3. Protect Users (password hashes) and ActivityLog (audit) from other collaborators
const meta = await api.meta<{ sheets: { properties: { title: string }; protectedRanges?: unknown[] }[] }>(
  "sheets(properties(title),protectedRanges(protectedRangeId))",
);
const sa = need("GOOGLE_SERVICE_ACCOUNT_EMAIL");
const toProtect = [USERS_TAB, LOG_TAB].filter((t) => !meta.sheets.find((s) => s.properties.title === t)?.protectedRanges?.length);
await api.batchUpdate(
  toProtect.map((t) => ({
    addProtectedRange: {
      protectedRange: {
        range: { sheetId: ids.get(t) },
        description: t === USERS_TAB ? "Staff accounts — edit through the CMS" : "Audit trail — append-only",
        editors: { users: [sa] },
      },
    },
  })),
);
if (toProtect.length) console.log(`Protected: ${toProtect.join(", ")} (only the CMS and the sheet owner can edit)`);

// 4. First Super Admin
const usersTab = parseTab((await api.readTabs([USERS_TAB]))[0]);
const users = usersTab.records.filter((r) => r.cells.id && r.cells.email).map(recordToUser);
let adminId = users.find((u) => u.role === "super_admin")?.id ?? null;
if (adminArg) {
  const m = adminArg.match(/^\s*(.+?)\s*<\s*([^>]+)\s*>\s*$/);
  if (!m) throw new Error('Use --admin "Full Name <email@example.com>"');
  const [, full_name, rawEmail] = m;
  const email = rawEmail.toLowerCase();
  const { token, hash } = newOneTimeToken();
  const found = users.find((u) => u.email === email);
  const record: UserRecord = {
    ...(found ?? {
      id: randomUUID(),
      created_at: new Date().toISOString(),
      last_active_at: null,
      password_hash: "",
      site_ids: [],
    }),
    full_name,
    email,
    role: "super_admin",
    active: true,
    token_hash: hash,
    token_expires: new Date(Date.now() + 7 * 86_400_000).toISOString(),
  } as UserRecord;
  if (found) {
    const rec = usersTab.records.find((r) => r.cells.id === found.id)!;
    await api.writeRow(USERS_TAB, rec.row, toRow(usersTab.header, userToCells(record), rec.cells));
  } else {
    await api.appendRows(USERS_TAB, [toRow(usersTab.header, userToCells(record))]);
  }
  adminId = record.id;
  console.log(`\nSuper Admin ${full_name} <${email}> is ready. Set the password here (valid 7 days):\n  ${appUrl}/reset-password?token=${token}\n`);
} else if (!adminId && !demo) {
  console.log('\nNo Super Admin yet. Run again with --admin "Your Name <you@example.gov.ph>".');
}

// 5. Demo accounts — one per role, with known passwords (see src/lib/sheets/demo.ts).
//    For trying the CMS only: deactivate them before real staff use it.
const demoIds = new Map<string, string>();
if (demo) {
  const fresh = parseTab((await api.readTabs([USERS_TAB]))[0]);
  const have = fresh.records.filter((r) => r.cells.email).map(recordToUser);
  const add: string[][] = [];
  for (const d of DEMO_USERS) {
    const found = have.find((u) => u.email === d.email);
    if (found) {
      demoIds.set(d.email, found.id);
      continue;
    }
    const u: UserRecord = {
      id: randomUUID(), full_name: d.full_name, email: d.email, role: d.role, site_ids: d.site_ids, active: true,
      last_active_at: null, created_at: new Date().toISOString(), password_hash: await hashPassword(d.password), token_hash: "", token_expires: "",
    };
    demoIds.set(d.email, u.id);
    add.push(toRow(fresh.header, userToCells(u)));
  }
  await api.appendRows(USERS_TAB, add);
  console.log(`
Demo accounts (sign in at ${appUrl}/login):`);
  for (const d of DEMO_USERS) console.log(`  ${d.role.padEnd(12)} ${d.email.padEnd(32)} ${d.password}`);
  adminId ??= demoIds.get("superadmin@tourism-desk.test")!;
}

// 6. Demo content
if (demo) {
  const tabs = await api.readTabs(SITES.map((s) => s.tab));
  for (const [i, site] of SITES.entries()) {
    const { header, records } = parseTab(tabs[i]);
    if (records.length) {
      console.log(`${site.tab}: has content already, demo rows skipped.`);
      continue;
    }
    const rows = demoEntries(site.id, demoIds.get(DEMO_AUTHOR[site.id]) ?? adminId, adminId).map((e) => toRow(header, entryToCells(e)));
    await api.appendRows(site.tab, rows);
    console.log(`${site.tab}: added ${rows.length} demo entries.`);
  }
}

console.log("Sheet is ready.");
