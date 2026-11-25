"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { requestPasswordReset, signIn } from "@/app/actions/auth";
import { Icon } from "@/components/icon";
import { Avatar } from "@/components/bits";
import { ROLE_LABEL } from "@/lib/permissions";
import type { Role } from "@/lib/types";

export interface DemoAccount {
  full_name: string;
  email: string;
  password: string;
  role: Role;
  scope: string;
}

type View = "login" | "forgot";

export function LoginForms({
  signedOutAt,
  initialError,
  googleEnabled,
  demoAccounts,
}: {
  signedOutAt: string | null;
  initialError: string | null;
  googleEnabled: boolean;
  /** Local demo mode only: one-click fill for the demo logins. */
  demoAccounts: DemoAccount[];
}) {
  const [view, setView] = useState<View>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginState, loginAction] = useActionState(signIn, undefined);
  const [resetState, resetAction] = useActionState(requestPasswordReset, undefined);

  if (view === "forgot" && resetState?.sent) {
    return (
      <div className="flex flex-col gap-4">
        <Icon name="envelope-simple" size={44} className="text-accent" />
        <h1 className="m-0 text-4xl leading-[1.08]">Check your inbox</h1>
        <p className="m-0 text-neutral-800">
          If <strong>{resetState.sent}</strong> has an account, a reset link is on its way. It expires in 30 minutes. The
          request is recorded in the activity log.
        </p>
        <button type="button" onClick={() => setView("login")} className="btn btn-secondary self-start text-[15px]">
          Back to sign in
        </button>
      </div>
    );
  }

  if (view === "forgot") {
    return (
      <form action={resetAction} className="flex flex-col gap-[18px]">
        <button type="button" onClick={() => setView("login")} className="btn-link flex items-center gap-1.5 self-start text-sm">
          <Icon name="arrow-left" size={16} />
          Back to sign in
        </button>
        <div>
          <div className="kicker text-accent-700">Account recovery</div>
          <h1 className="mt-1.5 mb-0 text-4xl leading-[1.08]">Reset your password</h1>
        </div>
        <p className="m-0 text-neutral-800">
          Enter your work email. We&apos;ll send a link that expires in 30 minutes.
        </p>
        <EmailField value={email} onChange={setEmail} />
        {resetState?.error && <p className="m-0 text-sm text-magenta-700">{resetState.error}</p>}
        <Submit label="Send reset link" />
      </form>
    );
  }

  const error = loginState?.error ?? initialError;
  return (
    <div className="flex flex-col gap-[18px]">
      {signedOutAt && !loginState && (
        <div className="flex items-start gap-2.5 rounded-sm bg-accent-100 px-3.5 py-3 text-sm text-accent-800" role="status">
          <Icon name="check-circle" size={18} className="mt-0.5" />
          <span>You signed out at {signedOutAt}. The sign-out was recorded in the activity log.</span>
        </div>
      )}
      <div>
        <div className="kicker text-accent-700">One desk · three sites</div>
        <h1 className="mt-1.5 mb-0 text-[40px] leading-[1.05] tracking-[-0.02em]">Sign in to publish.</h1>
      </div>

      {googleEnabled && (
        <>
          {/* A plain link: the route sets the OAuth state cookie and redirects to Google. */}
          <a href="/auth/google" className="btn btn-secondary w-full py-[11px] text-[15px] text-ink no-underline">
            <Icon name="google-logo" size={20} />
            Continue with Google
          </a>
          <div className="flex items-center gap-3 text-xs text-neutral-700">
            <span className="h-px flex-1 bg-ink/16" />
            or with email
            <span className="h-px flex-1 bg-ink/16" />
          </div>
        </>
      )}

      <form action={loginAction} className="flex flex-col gap-[18px]">
        <EmailField value={email} onChange={setEmail} />
        <label className="flex flex-col gap-[5px]">
          <span className="flex justify-between text-xs text-neutral-800">
            <span>Password</span>
            <button
              type="button"
              onClick={() => setView("forgot")}
              className="border-none bg-none p-0 text-xs text-accent-700 underline underline-offset-[3px]"
            >
              Forgot password?
            </button>
          </span>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="field min-h-[42px]"
          />
        </label>
        {error && (
          <p className="m-0 text-sm text-magenta-700" role="alert">
            {error}
          </p>
        )}
        <Submit label="Sign in" />
      </form>
      <p className="m-0 text-[13px] text-neutral-700">No account? Accounts are created by a Super Admin.</p>

      {demoAccounts.length > 0 && (
        <div className="flex flex-col gap-1">
          <div className="kicker text-neutral-700">Local demo — sign in as</div>
          {demoAccounts.map((d) => (
            <button
              key={d.email}
              type="button"
              onClick={() => {
                setEmail(d.email);
                setPassword(d.password);
              }}
              className="-mx-2 flex items-center gap-3 rounded-sm border-none bg-transparent p-2 text-left text-ink hover:bg-ink/[0.06]"
            >
              <Avatar id={d.email} name={d.full_name} size={34} />
              <span className="flex min-w-0 flex-1 flex-col leading-[1.35]">
                <span className="font-semibold">{d.full_name}</span>
                <span className="text-[13px] text-neutral-700">
                  {ROLE_LABEL[d.role]} · {d.scope}
                </span>
              </span>
              <Icon name="arrow-right" size={16} className="text-accent-700" />
            </button>
          ))}
          <p className="m-0 text-xs text-neutral-700">Fills the form; press Sign in. Data is saved in data/local-sheet.json.</p>
        </div>
      )}
    </div>
  );
}

function EmailField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-[5px]">
      <span className="text-xs text-neutral-800">Work email</span>
      <input
        type="email"
        name="email"
        autoComplete="username"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="name@cebu.gov.ph"
        className="field min-h-[42px]"
      />
    </label>
  );
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-primary py-3 text-[15px]">
      {pending ? "One moment…" : label}
    </button>
  );
}
