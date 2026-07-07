"use client";

import { requirePin } from "@/lib/pin-gate";
import { Lock } from "lucide-react";
import { useEffect, useState } from "react";

/** A settings row for the Profile page: shows whether a transaction PIN is set
 * and lets the user set or change it (change = reset via the Clerk session,
 * then set fresh — no current-PIN step). Reuses the global PIN modal. */
export function PinSettings() {
  const [isSet, setIsSet] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const res = await fetch("/api/pin/status");
      const data = (await res.json().catch(() => ({}))) as { isSet?: boolean };
      setIsSet(Boolean(data.isSet));
    } catch {
      setIsSet(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handle = async () => {
    setBusy(true);
    try {
      if (isSet) {
        // Change: clear then set a new one (authenticated via Clerk session).
        await fetch("/api/pin/reset", { method: "POST" });
      }
      await requirePin("setup");
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <span className="flex items-center gap-3">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ background: "var(--glide-surface-container-high)" }}
        >
          <Lock className="h-4 w-4" strokeWidth={2} />
        </span>
        <span className="text-left">
          <span className="block text-sm font-semibold tracking-tight text-[var(--glide-text)]">
            Transaction PIN
          </span>
          <span className="block text-xs text-[var(--glide-muted)]">
            {isSet === null
              ? "…"
              : isSet
                ? "On — required for transfers"
                : "Off — set one to secure transfers"}
          </span>
        </span>
      </span>
      <button
        type="button"
        onClick={() => void handle()}
        disabled={busy || isSet === null}
        className="glide-tap glide-label-mono shrink-0 rounded-full px-3 py-1 text-[11px] font-bold disabled:opacity-50"
        style={{
          background: "color-mix(in srgb, var(--glide-accent) 14%, transparent)",
          color: "var(--glide-accent)",
        }}
      >
        {isSet ? "Change" : "Set PIN"}
      </button>
    </div>
  );
}
