import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { LOG_CATEGORIES } from "@/lib/activity";
import { canSeeLog, ROLE_LABEL } from "@/lib/permissions";
import { ACTION_LABEL } from "@/lib/format";
import { collectionById, siteById } from "@/lib/config";

/** CSV of the log lines this person may see, honouring the page's site/category filters. Whole history. */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const site = request.nextUrl.searchParams.get("site");
  const cat = LOG_CATEGORIES[request.nextUrl.searchParams.get("cat") ?? "All"] ?? null;
  const { log, users } = await db().snapshot();
  const lines = log.filter((l) => canSeeLog(session.actor, l) && (!site || l.site_id === site) && (!cat || cat.includes(l.action)));

  const rows = [["Timestamp (UTC)", "User", "Role", "Action", "Entry", "Collection", "Site"]];
  for (const l of lines) {
    const u = users.find((p) => p.id === l.user_id);
    rows.push([
      l.at,
      l.user_name || u?.full_name || "",
      u ? ROLE_LABEL[u.role] : "",
      ACTION_LABEL[l.action] ?? l.action,
      l.item,
      collectionById(l.collection_id)?.label ?? "",
      siteById(l.site_id)?.name ?? "",
    ]);
  }
  // Quote every cell, and neutralise leading =+-@ so spreadsheet apps don't run them as formulas.
  const cell = (v: string) => `"${(/^[=+\-@\t\r]/.test(v) ? `'${v}` : v).replace(/"/g, '""')}"`;
  const csv = "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="activity-log-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
