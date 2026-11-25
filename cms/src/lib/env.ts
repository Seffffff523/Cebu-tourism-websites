function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name}. See .env.example.`);
  return v;
}

export const env = {
  sheetId: () => required("GOOGLE_SHEET_ID"),
  serviceAccountEmail: () => required("GOOGLE_SERVICE_ACCOUNT_EMAIL"),
  serviceAccountKey: () => required("GOOGLE_PRIVATE_KEY"),
  sessionSecret: () => {
    // Development may run with no .env.local at all (local demo mode); production may not.
    if (!process.env.SESSION_SECRET && process.env.NODE_ENV !== "production") return "local-development-only-session-secret-not-for-production";
    const s = required("SESSION_SECRET");
    if (s.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters.");
    return s;
  },
  siteUrl: () => (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, ""),
  googleOAuth: () =>
    process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET
      ? { clientId: process.env.GOOGLE_OAUTH_CLIENT_ID, clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET }
      : null,
  sesRegion: () => process.env.AWS_SES_REGION || process.env.AWS_REGION || "",
  sesFrom: () => process.env.AWS_SES_FROM || "",
  s3: () =>
    process.env.AWS_S3_BUCKET
      ? {
          bucket: process.env.AWS_S3_BUCKET,
          region: process.env.AWS_S3_REGION || process.env.AWS_REGION || "ap-southeast-1",
          publicUrl: (process.env.AWS_S3_PUBLIC_URL || `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com`).replace(/\/$/, ""),
        }
      : null,
  uploadDir: () => process.env.UPLOAD_DIR || "./data/uploads",
  publicOrigins: () =>
    (process.env.PUBLIC_SITE_ORIGINS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
};
