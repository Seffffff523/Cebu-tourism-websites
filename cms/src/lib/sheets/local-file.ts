import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { SITES } from "../config.ts";
import { hashPassword } from "../auth/crypto.ts";
import type { SheetsApi } from "./api.ts";
import { DEMO_AUTHOR, DEMO_USERS, demoEntries } from "./demo.ts";
import { entryToCells, toRow, userToCells, type UserRecord } from "./rows.ts";
import { CONTENT_HEADERS, LOG_HEADERS, LOG_TAB, USER_HEADERS, USERS_TAB } from "./schema.ts";

/**
 * Local demo mode: the same five tabs, kept in a JSON file instead of Google Sheets.
 * Used in development when GOOGLE_SHEET_ID isn't set, so the CMS can be tried
 * without any Google setup. First use seeds the demo logins and sample content.
 */
export class LocalFileSheets implements SheetsApi {
  private file: string;
  private data: Record<string, string[][]> | null = null;
  private ready: Promise<void> | null = null;

  constructor(file: string) {
    this.file = path.resolve(file);
  }

  async readTabs(tabs: string[]) {
    await this.init();
    return tabs.map((t) => (this.data![t] ?? []).map((r) => [...r]));
  }
  async writeRow(tab: string, row: number, values: string[]) {
    await this.init();
    const t = (this.data![tab] ??= []);
    while (t.length < row) t.push([]);
    t[row - 1] = [...values];
    this.save();
  }
  async appendRows(tab: string, rows: string[][]) {
    await this.init();
    (this.data![tab] ??= []).push(...rows.map((r) => [...r]));
    this.save();
  }
  async deleteRow(tab: string, row: number) {
    await this.init();
    this.data![tab]?.splice(row - 1, 1);
    this.save();
  }

  private init() {
    this.ready ??= (async () => {
      if (existsSync(this.file)) {
        this.data = JSON.parse(readFileSync(this.file, "utf8")).tabs;
        return;
      }
      this.data = await seed();
      this.save();
      console.info(`[local demo] Created ${this.file} with ${DEMO_USERS.length} demo logins and sample content.`);
    })();
    return this.ready;
  }

  private save() {
    mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    writeFileSync(tmp, JSON.stringify({ note: "Tourism Desk local demo data. Delete this file to reset.", tabs: this.data }, null, 1));
    renameSync(tmp, this.file);
  }
}

async function seed(): Promise<Record<string, string[][]>> {
  const now = new Date().toISOString();
  const users: UserRecord[] = [];
  for (const d of DEMO_USERS) {
    users.push({
      id: randomUUID(), full_name: d.full_name, email: d.email, role: d.role, site_ids: d.site_ids, active: true,
      last_active_at: null, created_at: now, password_hash: await hashPassword(d.password), token_hash: "", token_expires: "",
    });
  }
  const idOf = (email: string) => users.find((u) => u.email === email)?.id ?? null;
  const reviewer = idOf("superadmin@tourism-desk.test");

  const tabs: Record<string, string[][]> = {};
  for (const s of SITES) {
    const header = [...CONTENT_HEADERS];
    tabs[s.tab] = [header, ...demoEntries(s.id, idOf(DEMO_AUTHOR[s.id]), reviewer).map((e) => toRow(header, entryToCells(e)))];
  }
  tabs[USERS_TAB] = [[...USER_HEADERS], ...users.map((u) => toRow([...USER_HEADERS], userToCells(u)))];
  tabs[LOG_TAB] = [[...LOG_HEADERS]];
  return tabs;
}
