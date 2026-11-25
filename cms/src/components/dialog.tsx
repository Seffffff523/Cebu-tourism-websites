"use client";

import { useEffect, useRef } from "react";

/**
 * Modal built on <dialog>: focus trapping, Escape and the inert background
 * come from the browser.
 */
export function Dialog({
  open,
  onClose,
  children,
  label,
  width = 460,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  label: string;
  width?: number;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={label}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto w-[calc(100%-40px)] rounded-md bg-paper p-6 text-ink shadow-lg backdrop:bg-navy/55"
      style={{ maxWidth: width }}
    >
      {open && <div className="flex flex-col gap-3.5">{children}</div>}
    </dialog>
  );
}
