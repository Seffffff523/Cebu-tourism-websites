import { randomUUID } from "node:crypto";
import type { Entry, EntryStatus, Role } from "../types.ts";

/**
 * Demo logins and sample content (from the Tourism CMS v2 design). Used by
 * `npm run sheet:setup -- --demo` and by local demo mode. The passwords are public:
 * deactivate these accounts before real staff use the CMS.
 */
export const DEMO_USERS: { full_name: string; email: string; role: Role; site_ids: string[]; password: string }[] = [
  { full_name: "Ana Villanueva", email: "superadmin@tourism-desk.test", role: "super_admin", site_ids: [], password: "Demo-Super-2026" },
  { full_name: "Marco Dela Cruz", email: "admin@tourism-desk.test", role: "admin", site_ids: ["prov", "city"], password: "Demo-Admin-2026" },
  { full_name: "Jenny Lim", email: "editor.r7@tourism-desk.test", role: "editor", site_ids: ["r7"], password: "Demo-EditorR7-2026" },
  { full_name: "Paolo Ybañez", email: "editor.city@tourism-desk.test", role: "editor", site_ids: ["city"], password: "Demo-EditorCity-2026" },
];

/** Who writes the sample content on each site, so every demo login has work waiting. */
export const DEMO_AUTHOR: Record<string, string> = {
  prov: "admin@tourism-desk.test",
  city: "editor.city@tourism-desk.test",
  r7: "editor.r7@tourism-desk.test",
};

const PV = "https://cebu-island-tourism.web.app";
const CT = "https://cebucitytourism.web.app";
const R7 = "https://r7-tourism.web.app";

// [collection, title, subtitle, summary, status, image]
type Row = [string, string, string, string, EntryStatus, string];
const CONTENT: Record<string, Row[]> = {
  prov: [
    ["dest", "Osmeña Peak", "Dalaguete–Badian", "The highest point in Cebu: a short climb to a ridge of jagged limestone hills.", "published", PV + "/images/localized/8b529271-osme-ia-peak-4.jpg"],
    ["dest", "Bojo River", "Aloguinsan", "A community-run river cruise through mangroves to the sea.", "in_review", PV + "/images/hero/Bojo-River.jpg"],
    ["dest", "Kawasan Falls", "Badian", "Turquoise tiers of water at the start of the canyoneering route.", "published", PV + "/images/hero/Alegria-Canyoonering.jpg"],
    ["dest", "Moalboal Sardine Run", "Moalboal", "Millions of sardines, a few fin-kicks from the shore.", "draft", PV + "/images/localized/1bee8a42-moalboal-mikebarrow-5116.jpg"],
    ["events", "Sinulog sa Sugbo", "January", "The province-wide festival of festivals at the Capitol grounds.", "published", PV + "/images/hero/Sinulog-Festival.jpg"],
    ["events", "Kabkaban Festival", "March · Carcar", "Carcar celebrates its heritage, chicharon and shoes.", "returned", PV + "/images/localized/a6a4d2cc-heritage-church-dusk.jpg"],
    ["tours", "South Heritage Loop", "2 days", "Carcar, Argao and Boljoon: stone churches along the southern coast.", "published", PV + "/images/localized/a6a4d2cc-heritage-church-dusk.jpg"],
    ["tours", "Whale Sharks of Oslob", "1 day", "An early start for the gentle giants of Tan-awan.", "in_review", PV + "/images/localized/ff7d80df-whale-sharks-aerial.jpg"],
    ["dir", "Hinablon sa Argao Weavers", "DOT-R7-2024-0113", "Handloom weaving cooperative in Argao.", "published", PV + "/images/best-of-cebu/Hinablon-sa-Argao.jpg"],
    ["dir", "Talisay Lechon Row", "DOT-R7-2023-0870", "The lechon houses along the Talisay highway.", "published", PV + "/images/lechon.jpg"],
    ["pages", "A Province Shaped by History", "/history", "Chapter one of the provincial reader.", "published", PV + "/images/hero/Capitol-Building.jpg"],
    ["stats", "Annual visitors", "2025", "5.4M visitors; January peaks with Sinulog.", "published", PV + "/images/hero/Sinulog-Festival.jpg"],
    ["media", "Capitol Building at dusk", "Provincial Tourism Office", "Hero image, home page.", "published", PV + "/images/hero/Capitol-Building.jpg"],
    ["media", "Whale sharks, Oslob", "Provincial Tourism Office", "Aerial, used on Explore.", "published", PV + "/images/localized/ff7d80df-whale-sharks-aerial.jpg"],
    ["subs", "Our first dive at Moalboal", "Visitor from Manila", "We saw the sardine run on the second morning.", "in_review", PV + "/images/localized/1bee8a42-moalboal-mikebarrow-5116.jpg"],
  ],
  city: [
    ["dest", "Fort San Pedro", "Plaza Independencia", "The oldest triangular bastion fort in the country.", "published", CT + "/img/CC-HOME-06.webp"],
    ["dest", "Heritage of Cebu Monument", "Parian", "Five centuries in one sculpture.", "published", CT + "/img/CC-HOME-01.webp"],
    ["dest", "South Road Properties", "SRP", "The city at dusk from the coastal road.", "draft", CT + "/img/CC-HOME-05.webp"],
    ["events", "Sinulog 2027 Grand Parade", "18 January 2027", "The third Sunday of January, along the parade route.", "in_review", CT + "/img/CC-HOME-03.webp"],
    ["events", "Pasigarbo sa Sugbo", "August", "A festival of festivals.", "published", CT + "/img/CC-HOME-03.webp"],
    ["tours", "The Heart of the City", "Day one · on foot", "The oldest streets between the port and Colon.", "published", CT + "/img/CC-HOME-01.webp"],
    ["tours", "The Highlands", "Day two", "The ridge rises fast; from the top the story is laid out.", "published", CT + "/img/CC-HOME-02.webp"],
    ["dir", "Casa Gorordo Museum", "DOT-R7-2022-0412", "A 19th-century house in the Parian.", "published", CT + "/img/CC-HOME-06.webp"],
    ["pages", "Kagahapon", "/story", "Yesterday: the port before 1521.", "published", CT + "/img/CC-HOME-02.webp"],
    ["pages", "Kaugmaon", "/kaugmaon", "The chapter we now write.", "returned", CT + "/img/CC-HOME-04.webp"],
    ["media", "Sinulog street parade", "Jumelito Capilot", "Free to reuse with credit.", "published", CT + "/img/CC-HOME-03.webp"],
  ],
  r7: [
    ["dest", "Balicasag Island", "Panglao, Bohol", "Marine sanctuary off Panglao.", "published", R7 + "/media/balicasag-island-1-1280.jpg"],
    ["dest", "Bojo River", "Aloguinsan, Cebu", "Mangrove river cruise run by the community.", "published", R7 + "/media/bojo-river-2-1280.jpg"],
    ["events", "Sandugo Festival", "July · Tagbilaran", "The blood compact, re-enacted.", "returned", R7 + "/media/balicasag-island-1-1280.jpg"],
    ["tours", "Come for the city, stay for the islands", "3 days", "Cebu City to Panglao by fast craft.", "draft", R7 + "/media/bojo-river-2-1280.jpg"],
    ["dir", "Aloguinsan river guides", "DOT-R7-2023-0219", "Community guides at Bojo River.", "in_review", R7 + "/media/bojo-river-2-1280.jpg"],
    ["stats", "Foreign arrivals, Central Visayas", "2000–2024", "Most of any region over 25 years.", "published", R7 + "/media/balicasag-island-1-1280.jpg"],
  ],
};

/** Sample entries for one site. `authorId` writes them; `reviewerId` published or returned them. */
export function demoEntries(siteId: string, authorId: string | null, reviewerId: string | null): Entry[] {
  return (CONTENT[siteId] ?? []).map(([collection_id, title, subtitle, summary, status, image_url], k) => {
    const at = new Date(Date.now() - (k + 1) * 3_600_000 * (status === "published" ? 20 : 3)).toISOString();
    const fields = { title, subtitle, summary, body: "", image_url };
    const reviewed = status === "published" || status === "returned";
    return {
      id: randomUUID(),
      site_id: siteId,
      collection_id,
      ...fields,
      status,
      review_note: status === "returned" ? "Please add the 2026 schedule and a photo credit before this goes live." : "",
      author_id: authorId,
      last_editor_id: reviewed ? reviewerId : authorId,
      published: status === "published" ? fields : null,
      published_at: status === "published" ? at : null,
      created_at: at,
      updated_at: at,
    };
  });
}
