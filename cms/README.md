# The Tourism Desk

The content management system for three public tourism sites. All of its data lives in **one Google Spreadsheet**, and there is no separate database server.

| Site | Host | Sheet tab |
|---|---|---|
| Cebu Province Tourism | cebu-island-tourism.web.app | `PROV` |
| Cebu City Tourism | cebucitytourism.web.app | `CITY` |
| DOT Region VII | r7-tourism.web.app | `R7` |

It is built with Next.js 16 (App Router, Server Actions), TypeScript, Tailwind CSS 4, the Google Sheets API, AWS SES (email), AWS S3 (optional, for images) and Zod. The interface follows the *Tourism CMS v2* design.

## The spreadsheet

| Tab | What's in it |
|---|---|
| `PROV`, `CITY`, `R7` | Every entry for that website, one row each. The `collection` column says which kind: `dest`, `events`, `tours`, `dir`, `pages`, `stats`, `media` or `subs`. |
| `Users` | Staff accounts: name, email, role, sites, active flag, and password hash. **Protected:** only the CMS and the sheet owner can edit it. |
| `ActivityLog` | The audit trail. The CMS only ever adds rows to it. **Protected.** |

Row 1 of each tab is the header. The CMS finds columns by name, so you can reorder columns or add your own (for example a `notes` column). Columns it doesn't know about are left as they are.

Each content row has a **working copy** (`title` … `image_url`, `status`) and a **live copy** (`live_title` … `live_image_url`). The public sites read only the live copy. When an Editor changes a live entry, it goes back to review, and the site keeps showing the approved version until someone approves the change.

> **Editing the sheet by hand:** it works, but the CMS can't check what you type there. Don't change `id` values, and use the CMS to publish so that the live columns stay consistent.

## Roles

| | Super Admin | Admin | Editor |
|---|---|---|---|
| Sites | all | assigned | assigned |
| Create and edit entries | ✓ | ✓ | ✓ |
| Submit for review | — | — | ✓ |
| Publish, approve, return | ✓ | ✓ (own sites) | — |
| Delete | anything | anything on own sites | own-site drafts/returned that were never live |
| Activity log | everything | own sites + own actions | own sites + own actions |
| Invite users and change access | ✓ | — | — |

Every write goes through the server: `src/lib/workflow.ts` holds the rules and `src/app/actions/` applies them. Writes run one at a time, each against a fresh read of the sheet. If two people edit the same entry, the second save is refused instead of silently overwriting the first.

## Try it without any setup (local demo mode)

```bash
npm install
npm run dev
```

With no `GOOGLE_SHEET_ID` set, development mode keeps the same five tabs in `data/local-sheet.json` instead of Google Sheets. The file starts with the four demo logins and sample content, and the sign-in page lists them for one-click fill. Delete the file to reset. Production never uses this mode.

## Setup

1. **Create the spreadsheet.** Make a blank Google Sheet and copy its id from the URL.
2. **Create a service account.** In Google Cloud, create a project, enable the **Google Sheets API**, create a **service account** and add a JSON key. Then share the spreadsheet with the service account's email as an **Editor**.
3. **Configure env.** Run `cp .env.example .env.local` and fill in the sheet id, the service account email and private key, `APP_URL`, and a random `SESSION_SECRET`.
4. **Prepare the sheet and create yourself:**
   ```bash
   npm install
   npm run sheet:setup -- --admin "Your Name <you@cebu.gov.ph>"
   ```
   This creates the tabs, headers and protection, then prints a link where you set your password. Add `--demo` to load the sample content from the design and four demo logins:

   | Role | Email | Password | Sites |
   |---|---|---|---|
   | Super Admin | `superadmin@tourism-desk.test` | `Demo-Super-2026` | all |
   | Admin | `admin@tourism-desk.test` | `Demo-Admin-2026` | Province, Cebu City |
   | Editor | `editor.r7@tourism-desk.test` | `Demo-EditorR7-2026` | DOT R7 |
   | Editor | `editor.city@tourism-desk.test` | `Demo-EditorCity-2026` | Cebu City |

   Deactivate the demo logins (**Users & roles → Edit**) before real staff use the CMS, because their passwords are published here.
5. **Run it:** `npm run dev`. Invite everyone else from **Users & roles**. If email isn't set up yet, the CMS shows you the invite link to send yourself.

**Optional:**

- **Email:** set `AWS_SES_*` to send invites, password resets and review notifications. The SES sender must be verified, and the account must be out of the SES sandbox to email unverified addresses.
- **Google sign-in:** set `GOOGLE_OAUTH_*`. Only addresses already in `Users` get in.
- **Images on S3:** set `AWS_S3_*`. Otherwise uploads are saved to `UPLOAD_DIR` on the server.

## Hosting

Run it as a normal Node server (`npm run build && npm start`) on a VPS, an office server or a container host.

- With images on **S3**, the server keeps no files, so any Node host works, including Vercel.
- **Without S3**, uploads are stored on the server's disk, so that disk must be persistent and backed up.
- **Run one instance.** Writes are queued inside the Node process, so two instances writing to the same sheet could conflict.

## Limits to know

- **API quota:** Google allows about 60 Sheets requests per minute per service account. The CMS caches reads for 10 seconds, and a save costs about 3 requests, which is plenty for a small team. Heavy use shows up as short retries.
- **Cell size:** one cell holds at most 50,000 characters, so the body field is capped a little below that.
- **Log growth:** the whole `ActivityLog` tab is read on each refresh. After tens of thousands of rows, move older rows to an archive tab.

## Public content API

The public sites read approved content only:

```
GET /api/public/{site}                 # all published entries for a site (prov, city, r7)
GET /api/public/{site}/{collection}    # one collection
```

It returns `{ site, collection, entries: [{ id, collection, publishedAt, title, subtitle, summary, body, image }] }`. Browser calls are allowed from the origins in `PUBLIC_SITE_ORIGINS`.

## Development

```bash
npm test            # workflow rules, sheet store (against an in-memory fake sheet), auth crypto
npm run typecheck
npm run lint
```

```
src/lib/config.ts              the three sites and eight collections
src/lib/sheets/                schema (tabs/columns), Google Sheets client, row mapping, store
src/lib/workflow.ts            draft → review → publish rules
src/lib/auth/                  password hashing, signed sessions, rate limiting
src/app/(desk)/                signed-in screens: dashboard, content, activity log, users
src/app/actions/               server actions: auth, entries, users
src/app/api/                   public feed, image upload
scripts/setup-sheet.ts         creates and protects the tabs, first Super Admin, demo content
```
