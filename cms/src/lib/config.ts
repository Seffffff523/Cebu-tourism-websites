import type { Collection, Site } from "./types.ts";

/**
 * The three sites. `tab` is the sheet tab that holds the site's content.
 * Adding a site = add it here and run `npm run sheet:setup` to create its tab.
 */
export const SITES: (Site & { tab: string })[] = [
  {
    id: "prov",
    tab: "PROV",
    name: "Cebu Province Tourism",
    short_name: "Province",
    host: "cebu-island-tourism.web.app",
    color: "#d6006c",
    cover_url: "https://cebu-island-tourism.web.app/images/hero/Capitol-Building.jpg",
    logo_url: "https://cebu-island-tourism.web.app/cebu-province-seal.png",
    tagline: "A visual editorial of the province",
    sort: 1,
  },
  {
    id: "city",
    tab: "CITY",
    name: "Cebu City Tourism",
    short_name: "Cebu City",
    host: "cebucitytourism.web.app",
    color: "#e0a419",
    cover_url: "https://cebucitytourism.web.app/img/CC-HOME-01.webp",
    logo_url: "https://cebucitytourism.web.app/brand/crown-480.webp",
    tagline: "Cebu to the World",
    sort: 2,
  },
  {
    id: "r7",
    tab: "R7",
    name: "DOT Region VII",
    short_name: "DOT R7",
    host: "r7-tourism.web.app",
    color: "#037291",
    cover_url: "https://r7-tourism.web.app/media/balicasag-island-1-1280.jpg",
    logo_url: "https://r7-tourism.web.app/brand/logo-landscape-white-216.png",
    tagline: "Visit Central Visayas — more to love",
    sort: 3,
  },
];

export const COLLECTIONS: Collection[] = [
  { id: "dest", label: "Destinations", singular: "destination", sub_label: "Municipality / LGU", icon: "map-pin", sort: 1 },
  { id: "events", label: "Festivals & Events", singular: "event", sub_label: "Date", icon: "confetti", sort: 2 },
  { id: "tours", label: "Tours & Walks", singular: "tour", sub_label: "Duration", icon: "path", sort: 3 },
  { id: "dir", label: "Directory", singular: "listing", sub_label: "DOT accreditation no.", icon: "storefront", sort: 4 },
  { id: "pages", label: "Pages & Stories", singular: "page", sub_label: "URL path", icon: "article", sort: 5 },
  { id: "stats", label: "Statistics", singular: "figure", sub_label: "Period", icon: "chart-bar", sort: 6 },
  { id: "media", label: "Media", singular: "asset", sub_label: "Photo credit", icon: "images", sort: 7 },
  { id: "subs", label: "Visitor Stories", singular: "story", sub_label: "Submitted by", icon: "chat-circle-text", sort: 8 },
];

export const siteById = (id: string | null | undefined) => SITES.find((s) => s.id === id);
export const collectionById = (id: string | null | undefined) => COLLECTIONS.find((c) => c.id === id);
