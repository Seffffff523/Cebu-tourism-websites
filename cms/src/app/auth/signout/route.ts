import { NextResponse } from "next/server";
import { endSession } from "@/lib/session";
import { env } from "@/lib/env";

/** Clears a session that is no longer valid (deactivated account, changed password, expired). */
export async function GET() {
  await endSession();
  return NextResponse.redirect(`${env.siteUrl()}/login?e=session`);
}
