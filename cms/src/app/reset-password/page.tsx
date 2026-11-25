import type { Metadata } from "next";
import Link from "next/link";
import { dateline } from "@/lib/format";
import { SITES } from "@/lib/config";
import { AuthShell } from "../login/auth-shell";
import { PasswordForm } from "./password-form";

export const metadata: Metadata = { title: "Set your password" };

/** Reached from an invite or reset email: /reset-password?token=… */
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <AuthShell sites={SITES} dateline={dateline()}>
      {token ? (
        <PasswordForm token={token} />
      ) : (
        <div className="flex flex-col gap-4">
          <h1 className="m-0 text-4xl leading-[1.08]">This link is incomplete</h1>
          <p className="m-0 text-neutral-800">Open the link from your email again, or request a new one from the sign-in page.</p>
          <Link href="/login" className="btn btn-secondary self-start no-underline">
            Back to sign in
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
