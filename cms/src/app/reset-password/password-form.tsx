"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { setPasswordWithToken } from "@/app/actions/auth";

export function PasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState(setPasswordWithToken, undefined);
  return (
    <form action={action} className="flex flex-col gap-[18px]">
      <div>
        <div className="kicker text-accent-700">Account</div>
        <h1 className="mt-1.5 mb-0 text-4xl leading-[1.08]">Set your password</h1>
      </div>
      <p className="m-0 text-neutral-800">Use at least 10 characters. You&apos;ll be signed in straight after.</p>
      <input type="hidden" name="token" value={token} />
      <label className="flex flex-col gap-[5px]">
        <span className="text-xs text-neutral-800">New password</span>
        <input type="password" name="password" autoComplete="new-password" minLength={10} required className="field min-h-[42px]" />
      </label>
      <label className="flex flex-col gap-[5px]">
        <span className="text-xs text-neutral-800">Repeat it</span>
        <input type="password" name="confirm" autoComplete="new-password" minLength={10} required className="field min-h-[42px]" />
      </label>
      {state?.error && (
        <p className="m-0 text-sm text-magenta-700" role="alert">
          {state.error}
        </p>
      )}
      <Submit />
    </form>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-primary py-3 text-[15px]">
      {pending ? "Saving…" : "Save password and sign in"}
    </button>
  );
}
