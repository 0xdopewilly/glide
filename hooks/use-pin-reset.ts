"use client";

import { useReverification } from "@clerk/nextjs";
import { useCallback } from "react";

/** Forgot / change PIN. The server requires a fresh Clerk verification
 * (email code) for this, so Clerk's modal prompts the user and the request
 * retries automatically. Resolves true once the PIN was cleared; false if
 * the user cancelled or verification failed. */
export function usePinReset(): () => Promise<boolean> {
  const reset = useReverification(async () => {
    const res = await fetch("/api/pin/reset", { method: "POST" });
    return (await res.json().catch(() => ({}))) as { ok?: boolean };
  });
  return useCallback(async () => {
    try {
      const result = await reset();
      return result?.ok === true;
    } catch {
      return false;
    }
  }, [reset]);
}
