"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { signOut } from "@/app/actions/auth";
import { Dialog } from "@/components/dialog";
import { Icon } from "@/components/icon";

export function SignOutButton() {
  const [open, setOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setEditorOpen(new URLSearchParams(window.location.search).has("entry"));
          setOpen(true);
        }}
        title="Sign out"
        aria-label="Sign out"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-paper/20 bg-transparent text-paper hover:bg-white/10"
      >
        <Icon name="sign-out" size={18} />
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} label="Sign out" width={440}>
        <Icon name="sign-out" size={32} className="text-accent" />
        <div className="text-[22px] leading-tight font-semibold">Sign out of the Tourism Desk?</div>
        <p className="m-0 text-neutral-800">
          {editorOpen
            ? "You have an entry open in the editor. Unsaved changes will be lost. Your sign-out is recorded in the activity log."
            : "Your session on this device ends. Your sign-out is recorded in the activity log."}
        </p>
        <form action={signOut} className="mt-1.5 flex justify-end gap-2.5">
          <button type="button" onClick={() => setOpen(false)} className="btn btn-secondary">
            Stay signed in
          </button>
          <Confirm />
        </form>
      </Dialog>
    </>
  );
}

function Confirm() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-primary">
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
