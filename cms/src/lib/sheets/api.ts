import { JWT } from "google-auth-library";

/** The few spreadsheet operations the CMS needs. Rows are 1-based, as in Sheets. */
export interface SheetsApi {
  /** Whole tabs, header row included, in the order asked. */
  readTabs(tabs: string[]): Promise<string[][][]>;
  writeRow(tab: string, row: number, values: string[]): Promise<void>;
  appendRows(tab: string, rows: string[][]): Promise<void>;
  deleteRow(tab: string, row: number): Promise<void>;
}

export interface GoogleSheetsConfig {
  spreadsheetId: string;
  clientEmail: string;
  privateKey: string;
}

const BASE = "https://sheets.googleapis.com/v4/spreadsheets";
const q = (tab: string) => `'${tab.replace(/'/g, "''")}'`;

/** Sheets REST v4 over fetch, authenticated as a Google service account. */
export class GoogleSheets implements SheetsApi {
  // Plain fields, not constructor parameter properties: the setup script runs this
  // file with Node's built-in type stripping, which only supports erasable syntax.
  private cfg: GoogleSheetsConfig;
  private auth: JWT;
  private sheetIds: Map<string, number> | null = null;

  constructor(cfg: GoogleSheetsConfig) {
    this.cfg = cfg;
    this.auth = new JWT({
      email: cfg.clientEmail,
      key: cfg.privateKey.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
  }

  async readTabs(tabs: string[]) {
    const params = new URLSearchParams({ valueRenderOption: "FORMATTED_VALUE", majorDimension: "ROWS" });
    tabs.forEach((t) => params.append("ranges", q(t)));
    const res = await this.call<{ valueRanges: { values?: string[][] }[] }>("GET", `/values:batchGet?${params}`);
    return res.valueRanges.map((r) => (r.values ?? []).map((row) => row.map((c) => String(c ?? ""))));
  }

  async writeRow(tab: string, row: number, values: string[]) {
    const range = `${q(tab)}!A${row}`;
    await this.call("PUT", `/values/${encodeURIComponent(range)}?valueInputOption=RAW`, { range, values: [values] });
  }

  async appendRows(tab: string, rows: string[][]) {
    if (!rows.length) return;
    const range = `${q(tab)}!A1`;
    await this.call("POST", `/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
      range,
      values: rows,
    });
  }

  async deleteRow(tab: string, row: number) {
    const sheetId = (await this.tabIds()).get(tab);
    if (sheetId === undefined) throw new Error(`No tab named ${tab}`);
    await this.call("POST", ":batchUpdate", {
      requests: [{ deleteDimension: { range: { sheetId, dimension: "ROWS", startIndex: row - 1, endIndex: row } } }],
    });
  }

  // ─── used by the setup script ───────────────────────────────────────────
  async tabIds(refresh = false) {
    if (!this.sheetIds || refresh) {
      const res = await this.call<{ sheets: { properties: { sheetId: number; title: string } }[] }>(
        "GET",
        "?fields=sheets.properties(sheetId,title)",
      );
      this.sheetIds = new Map(res.sheets.map((s) => [s.properties.title, s.properties.sheetId]));
    }
    return this.sheetIds;
  }

  async meta<T>(fields: string): Promise<T> {
    return this.call<T>("GET", `?fields=${encodeURIComponent(fields)}`);
  }

  async batchUpdate(requests: unknown[]) {
    if (requests.length) await this.call("POST", ":batchUpdate", { requests });
  }

  private async call<T = unknown>(method: string, path: string, body?: unknown, attempt = 0): Promise<T> {
    const { token } = await this.auth.getAccessToken();
    const res = await fetch(`${BASE}/${this.cfg.spreadsheetId}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    // Sheets allows ~60 requests/minute per user; back off on quota and transient errors.
    if ((res.status === 429 || res.status >= 500) && attempt < 3) {
      await new Promise((r) => setTimeout(r, 500 * 2 ** attempt + Math.random() * 250));
      return this.call<T>(method, path, body, attempt + 1);
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Google Sheets ${method} ${path.split("?")[0]} failed (${res.status}): ${text.slice(0, 300)}`);
    }
    return (await res.json()) as T;
  }
}
