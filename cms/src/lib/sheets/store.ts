import { SITES } from "../config.ts";
import type { Entry, LogRow } from "../types.ts";
import type { SheetsApi } from "./api.ts";
import { CONTENT_HEADERS, LOG_HEADERS, LOG_TAB, USER_HEADERS, USERS_TAB } from "./schema.ts";
import {
  entryToCells,
  logToCells,
  parseTab,
  recordToEntry,
  recordToLog,
  recordToUser,
  toRow,
  userToCells,
  type RawRecord,
  type UserRecord,
} from "./rows.ts";

export class ConflictError extends Error {}
export class NotFoundError extends Error {}

interface Located<T> {
  value: T;
  tab: string;
  rec: RawRecord;
}

export interface Snapshot {
  entries: Entry[];
  users: UserRecord[];
  log: LogRow[];
  at: number;
}

interface Internal extends Snapshot {
  headers: Map<string, string[]>;
  entryIndex: Map<string, Located<Entry>>;
  userIndex: Map<string, Located<UserRecord>>;
}

const TABS = [...SITES.map((s) => s.tab), USERS_TAB, LOG_TAB];

/**
 * The CMS database, kept in one Google Spreadsheet.
 * Reads are cached for `ttlMs` (Sheets allows ~60 requests/min). Writes from this
 * server run one at a time and always re-read the sheet first, so a row number is
 * never stale when it is written or deleted — even if someone edited the sheet by hand.
 */
export function createStore(api: SheetsApi, { ttlMs = 10_000 } = {}) {
  let cache: Internal | null = null;
  let inflight: Promise<Internal> | null = null;
  let queue: Promise<unknown> = Promise.resolve();

  async function load(): Promise<Internal> {
    const tabs = await api.readTabs(TABS);
    const headers = new Map<string, string[]>();
    const entryIndex = new Map<string, Located<Entry>>();
    const userIndex = new Map<string, Located<UserRecord>>();
    const entries: Entry[] = [];
    const users: UserRecord[] = [];
    let log: LogRow[] = [];

    TABS.forEach((tab, i) => {
      const { header, records } = parseTab(tabs[i] ?? []);
      headers.set(tab, header.length ? header : defaultHeader(tab));
      const site = SITES.find((s) => s.tab === tab);
      if (site) {
        for (const rec of records) {
          if (!rec.cells.id || !rec.cells.title) continue;
          const e = recordToEntry(site.id, rec);
          entries.push(e);
          entryIndex.set(e.id, { value: e, tab, rec });
        }
      } else if (tab === USERS_TAB) {
        for (const rec of records) {
          if (!rec.cells.id || !rec.cells.email) continue;
          const u = recordToUser(rec);
          users.push(u);
          userIndex.set(u.id, { value: u, tab, rec });
        }
      } else {
        log = records.filter((r) => r.cells.at && r.cells.action).map(recordToLog);
      }
    });
    log.sort((a, b) => b.at.localeCompare(a.at));
    return { entries, users, log, headers, entryIndex, userIndex, at: Date.now() };
  }

  async function read(fresh = false): Promise<Internal> {
    if (!fresh && cache && Date.now() - cache.at < ttlMs) return cache;
    if (!fresh && inflight) return inflight;
    const p = load().then((s) => (cache = s));
    if (!fresh) inflight = p.finally(() => (inflight = null));
    return p;
  }

  type LogLines = Omit<LogRow, "id">[];

  /**
   * Run writes one after another, each against a fresh read of the sheet
   * (`fresh: false` only for pure appends, which need just the header row).
   * Log lines that describe the write are appended in the same step.
   */
  function mutate<T>(fn: (s: Internal) => Promise<T>, log?: (result: T) => LogLines, fresh = true): Promise<T> {
    const run = queue.then(async () => {
      try {
        const s = await read(fresh);
        const result = await fn(s);
        const lines = log?.(result) ?? [];
        if (lines.length) await api.appendRows(LOG_TAB, lines.map((l) => toRow(header(s, LOG_TAB), logToCells(l))));
        return result;
      } finally {
        cache = null;
      }
    });
    queue = run.catch(() => undefined);
    return run;
  }

  const header = (s: Internal, tab: string) => s.headers.get(tab) ?? defaultHeader(tab);

  return {
    snapshot: (fresh = false): Promise<Snapshot> => read(fresh),
    invalidate: () => void (cache = null),

    insertEntry: (e: Entry, log?: (e: Entry) => LogLines) =>
      mutate(async (s) => {
        const tab = siteTab(e.site_id);
        await api.appendRows(tab, [toRow(header(s, tab), entryToCells(e))]);
        return e;
      }, log),

    /** Applies `next(current)`; refuses if the row changed since `expectedUpdatedAt`. */
    updateEntry: (id: string, next: (current: Entry) => Entry, opts: { expectedUpdatedAt?: string; log?: (e: Entry) => LogLines } = {}) =>
      mutate(async (s) => {
        const found = s.entryIndex.get(id);
        if (!found) throw new NotFoundError("This entry no longer exists.");
        if (opts.expectedUpdatedAt && found.value.updated_at !== opts.expectedUpdatedAt)
          throw new ConflictError("Someone else changed this entry while you were editing. Reopen it to see their version.");
        const updated = next(found.value);
        await api.writeRow(found.tab, found.rec.row, toRow(header(s, found.tab), entryToCells(updated), found.rec.cells));
        return updated;
      }, opts.log),

    /** Deletes after `check(current)` passes against the fresh row. */
    deleteEntry: (id: string, check: (current: Entry) => void, log?: (e: Entry) => LogLines) =>
      mutate(async (s) => {
        const found = s.entryIndex.get(id);
        if (!found) throw new NotFoundError("This entry no longer exists.");
        check(found.value);
        await api.deleteRow(found.tab, found.rec.row);
        return found.value;
      }, log),

    insertUser: (u: UserRecord, log?: (u: UserRecord) => LogLines) =>
      mutate(async (s) => {
        if (s.users.some((x) => x.email === u.email)) throw new ConflictError("That email already has an account.");
        await api.appendRows(USERS_TAB, [toRow(header(s, USERS_TAB), userToCells(u))]);
        return u;
      }, log),

    updateUser: (id: string, next: (current: UserRecord) => UserRecord, log?: (u: UserRecord) => LogLines) =>
      mutate(async (s) => {
        const found = s.userIndex.get(id);
        if (!found) throw new NotFoundError("That account no longer exists.");
        const updated = next(found.value);
        await api.writeRow(USERS_TAB, found.rec.row, toRow(header(s, USERS_TAB), userToCells(updated), found.rec.cells));
        return updated;
      }, log),

    /** Append-only: the app never rewrites or deletes log rows. */
    appendLog: (lines: LogLines) => mutate(async () => undefined, () => lines, false),
  };
}

export type Store = ReturnType<typeof createStore>;

function siteTab(siteId: string) {
  const site = SITES.find((s) => s.id === siteId);
  if (!site) throw new NotFoundError(`Unknown site ${siteId}`);
  return site.tab;
}

function defaultHeader(tab: string): string[] {
  if (tab === USERS_TAB) return [...USER_HEADERS];
  if (tab === LOG_TAB) return [...LOG_HEADERS];
  return [...CONTENT_HEADERS];
}
