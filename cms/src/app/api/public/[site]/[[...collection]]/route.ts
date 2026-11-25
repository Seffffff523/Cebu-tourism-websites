import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { collectionById, siteById } from "@/lib/config";

/**
 * Read-only feed of approved content for the public sites.
 *   GET /api/public/prov            → every published entry on the Province site
 *   GET /api/public/prov/events     → published Festivals & Events only
 * Serves only the approved (live_*) copy — never drafts or edits awaiting review.
 */
function cors(request: NextRequest) {
  const origin = request.headers.get("origin") ?? "";
  const headers: Record<string, string> = { Vary: "Origin" };
  if (env.publicOrigins().includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "GET, OPTIONS";
  }
  return headers;
}

export function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: cors(request) });
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ site: string; collection?: string[] }> }) {
  const { site, collection } = await ctx.params;
  const coll = collection?.[0] ?? null;
  if (!siteById(site) || (collection?.length ?? 0) > 1 || (coll && !collectionById(coll)))
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: cors(request) });

  try {
    const { entries } = await db().snapshot();
    const out = entries
      .filter((e) => e.site_id === site && e.published && (!coll || e.collection_id === coll))
      .sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""))
      .map((e) => ({
        id: e.id,
        collection: e.collection_id,
        publishedAt: e.published_at,
        title: e.published!.title,
        subtitle: e.published!.subtitle,
        summary: e.published!.summary,
        body: e.published!.body,
        image: absolute(e.published!.image_url),
      }));
    return NextResponse.json(
      { site, collection: coll, entries: out },
      { headers: { ...cors(request), "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
    );
  } catch (err) {
    console.error("[public api]", err);
    return NextResponse.json({ error: "Unavailable" }, { status: 503, headers: cors(request) });
  }
}

/** Locally stored uploads are relative to the CMS; the public sites need full URLs. */
const absolute = (url: string) => (url.startsWith("/uploads/") ? `${env.siteUrl()}${url}` : url);
