"use client";

import { SettingsRow } from "@/components/settings-list";
import { usePinReset } from "@/hooks/use-pin-reset";
import { requirePin } from "@/lib/pin-gate";
import { Lock } from "lucide-react";
import { useEffect, useState } from "react";

/** A settings row for the Profile page: shows whether a transaction PIN is set
 * and lets the user set or change it (change = reset via the Clerk session,
 * then set fresh — no current-PIN step). Reuses the global PIN modal. */
export function PinSettings() {
  const resetPin = usePinReset();
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
        // Change: clear then set a new one. Clearing needs a fresh email-code
        // verification; stop if the user cancels it.
        if (!(await resetPin())) return;
      }
      await requirePin("setup");
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <SettingsRow
      icon={Lock}
      title="Transaction PIN"
      subtitle={
        isSet === null
          ? "Checking…"
          : isSet
            ? "Required for every payment"
            : "Add a PIN to protect your payments"
      }
      value={isSet === null ? undefined : isSet ? "Change" : "Set up"}
      onClick={() => void handle()}
      disabled={busy || isSet === null}
    />
  );
}
