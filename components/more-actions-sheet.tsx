"use client";

import { SettingsRow } from "@/components/settings-list";
import { HOME_MORE_ACTIONS } from "@/lib/payment-actions";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";

/** Home's "More" action sheet. Appears instantly (no slide), per the motion
 * policy; closes on backdrop tap or Escape. */
export function MoreActionsSheet({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="More actions"
    >
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-black/45"
      />
      <div
        className="glide-surface-card relative w-full max-w-md rounded-b-none rounded-t-3xl pb-[max(1rem,env(safe-area-inset-bottom))] pt-2"
        style={{ borderBottom: "none" }}
      >
        <div className="flex items-center justify-between px-5 pb-1 pt-2">
          <h2 className="text-[17px] font-bold tracking-tight text-[var(--glide-text)]">
            More
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="glide-tap flex h-9 w-9 items-center justify-center rounded-full"
            style={{ background: "var(--glide-surface-container-high)" }}
          >
            <X className="h-4 w-4" strokeWidth={2.25} />
          </button>
        </div>
        {/* Every action leaves Home, which unmounts this sheet. */}
        <div>
          {HOME_MORE_ACTIONS.map((a) => (
            <SettingsRow
              key={a.id}
              icon={a.icon}
              title={a.title}
              subtitle={a.subtitle}
              href={a.href}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
