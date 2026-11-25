import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { dateline } from "@/lib/format";
import { env } from "@/lib/env";
import { SITES } from "@/lib/config";
import { isLocalDemo } from "@/lib/db";
import { DEMO_USERS } from "@/lib/sheets/demo";
import { AuthShell } from "./auth-shell";
import { LoginForms } from "./login-forms";

export const metadata: Metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  "no-access": "That Google account doesn't have access to the Tourism Desk. Ask a Super Admin to invite you.",
  google: "Google sign-in didn't complete. Try again, or use your email and password.",
  session: "Your session ended. Sign in again.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (await getSession()) redirect("/");
  const sp = await searchParams;
  return (
    <AuthShell sites={SITES} dateline={dateline()}>
      <LoginForms
        signedOutAt={sp.out ?? null}
        initialError={sp.e ? (ERRORS[sp.e] ?? null) : null}
        googleEnabled={!!env.googleOAuth()}
        demoAccounts={
          isLocalDemo()
            ? DEMO_USERS.map((d) => ({
                ...d,
                scope: d.role === "super_admin" ? "All 3 sites" : d.site_ids.map((id) => SITES.find((s) => s.id === id)?.short_name).join(" + "),
              }))
            : []
        }
      />
    </AuthShell>
  );
}
