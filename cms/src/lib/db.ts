import "server-only";
import { GoogleSheets } from "@/lib/sheets/api";
import { LocalFileSheets } from "@/lib/sheets/local-file";
import { createStore, type Store } from "@/lib/sheets/store";
import { env } from "@/lib/env";

// One store per server process, so the read cache and the write queue are shared.
const g = globalThis as unknown as { __tourismDeskStore?: Store };

/**
 * Local demo mode: development without GOOGLE_SHEET_ID uses data/local-sheet.json
 * (seeded with demo logins). Production always requires the Google Sheet.
 */
export const isLocalDemo = () => !process.env.GOOGLE_SHEET_ID && process.env.NODE_ENV !== "production";

export function db(): Store {
  g.__tourismDeskStore ??= isLocalDemo()
    ? createStore(new LocalFileSheets(process.env.LOCAL_SHEET_FILE || "./data/local-sheet.json"), { ttlMs: 0 })
    : createStore(
        new GoogleSheets({
          spreadsheetId: env.sheetId(),
          clientEmail: env.serviceAccountEmail(),
          privateKey: env.serviceAccountKey(),
        }),
      );
  return g.__tourismDeskStore;
}
