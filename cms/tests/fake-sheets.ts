import type { SheetsApi } from "../src/lib/sheets/api.ts";

/** In-memory stand-in for a Google Spreadsheet, with a call counter. */
export class FakeSheets implements SheetsApi {
  tabs = new Map<string, string[][]>();
  calls = { read: 0, write: 0, append: 0, del: 0 };

  constructor(initial: Record<string, string[][]> = {}) {
    for (const [k, v] of Object.entries(initial)) this.tabs.set(k, v.map((r) => [...r]));
  }

  async readTabs(tabs: string[]) {
    this.calls.read++;
    return tabs.map((t) => (this.tabs.get(t) ?? []).map((r) => [...r]));
  }
  async writeRow(tab: string, row: number, values: string[]) {
    this.calls.write++;
    const t = this.tab(tab);
    while (t.length < row) t.push([]);
    t[row - 1] = [...values];
  }
  async appendRows(tab: string, rows: string[][]) {
    this.calls.append++;
    this.tab(tab).push(...rows.map((r) => [...r]));
  }
  async deleteRow(tab: string, row: number) {
    this.calls.del++;
    this.tab(tab).splice(row - 1, 1);
  }
  private tab(name: string) {
    if (!this.tabs.has(name)) this.tabs.set(name, []);
    return this.tabs.get(name)!;
  }
}
