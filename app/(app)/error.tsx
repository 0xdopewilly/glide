"use client";

import { GlidePillButton } from "@/components/glide-pill-button";
import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Segment error boundary for the authenticated shell. Any render/runtime
 * error in an (app) page lands here instead of a white screen — the bottom nav
 * and shell stay intact, so the user can retry or navigate away. */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("[Glide] app error", error?.digest ?? error?.message ?? "");
  }, [error]);

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-8 text-center">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{
          background: "color-mix(in srgb, var(--glide-error) 12%, transparent)",
          color: "var(--glide-error)",
        }}
      >
        <AlertTriangle className="h-7 w-7" strokeWidth={2} />
      </div>
      <p className="mt-5 text-lg font-semibold tracking-tight text-[var(--glide-text)]">
        Something went wrong
      </p>
      <p className="mt-2 text-sm text-[var(--glide-muted)]">
        This screen hit an unexpected error. Your money and data are safe.
      </p>
      <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
        <GlidePillButton
          onClick={reset}
          className="w-full justify-center py-3.5"
        >
          Try again
        </GlidePillButton>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="glide-tap w-full rounded-full border py-3.5 text-sm font-semibold"
          style={{
            borderColor: "var(--glide-border)",
            color: "var(--glide-text)",
          }}
        >
          Go home
        </button>
      </div>
    </div>
  );
}
