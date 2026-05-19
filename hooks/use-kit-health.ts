"use client";

import type { KitKeyStatus } from "@/lib/kit-key";
import { useEffect, useState } from "react";

export function useKitHealth() {
  const [status, setStatus] = useState<KitKeyStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/health/kit")
      .then((r) => r.json())
      .then((data: KitKeyStatus) => {
        if (!cancelled) setStatus(data);
      })
      .catch(() => {
        if (!cancelled) {
          setStatus({
            ok: false,
            circleApiKeySet: false,
            circleEntitySecretSet: false,
            hint: "Could not verify kit key. Check your connection and try again.",
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { status, loading };
}
