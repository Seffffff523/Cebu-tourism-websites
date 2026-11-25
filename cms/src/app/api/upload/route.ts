import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSession } from "@/lib/session";
import { canAccessSite } from "@/lib/permissions";
import { env } from "@/lib/env";

const MAX_BYTES = 10 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif" };
let s3: S3Client | null = null;

/**
 * Image upload for the entry editor. Goes to S3 when AWS_S3_BUCKET is set,
 * otherwise to UPLOAD_DIR on this server (served at /uploads/…).
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in again." }, { status: 401 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const siteId = String(form?.get("site") ?? "");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file." }, { status: 400 });
  if (!canAccessSite(session.actor, siteId)) return NextResponse.json({ error: "You don't have access to this site." }, { status: 403 });
  const ext = TYPES[file.type];
  if (!ext) return NextResponse.json({ error: "Use a JPEG, PNG, WebP, GIF or AVIF image." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Images must be 10 MB or smaller." }, { status: 400 });

  const bytes = Buffer.from(await file.arrayBuffer());
  const key = `${siteId}/${new Date().toISOString().slice(0, 7)}/${randomUUID()}.${ext}`;

  try {
    const cfg = env.s3();
    if (cfg) {
      s3 ??= new S3Client({ region: cfg.region });
      await s3.send(
        new PutObjectCommand({ Bucket: cfg.bucket, Key: key, Body: bytes, ContentType: file.type, CacheControl: "public, max-age=31536000, immutable" }),
      );
      return NextResponse.json({ url: `${cfg.publicUrl}/${key}` });
    }
    const target = path.resolve(env.uploadDir(), key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes);
    return NextResponse.json({ url: `/uploads/${key}` });
  } catch (err) {
    console.error("[upload]", err);
    return NextResponse.json({ error: "The upload failed. Try again." }, { status: 500 });
  }
}
