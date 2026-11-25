import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";

const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", avif: "image/avif" };

/** Serves images saved to UPLOAD_DIR (when S3 isn't configured). Public, like the sites that show them. */
export async function GET(_: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const parts = (await ctx.params).path;
  // Only the shapes the uploader writes: <site>/<yyyy-mm>/<uuid>.<ext>
  if (parts.length !== 3 || !parts.every((p) => /^[a-z0-9-]+(\.[a-z0-9]+)?$/i.test(p)))
    return new NextResponse("Not found", { status: 404 });
  const ext = parts[2].split(".").pop()!.toLowerCase();
  if (!TYPES[ext]) return new NextResponse("Not found", { status: 404 });

  const root = path.resolve(env.uploadDir());
  const file = path.resolve(root, ...parts);
  if (!file.startsWith(root + path.sep)) return new NextResponse("Not found", { status: 404 });
  try {
    const bytes = await readFile(file);
    return new NextResponse(bytes, {
      headers: { "Content-Type": TYPES[ext], "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
