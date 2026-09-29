"use client";

import { useKitHealth } from "@/hooks/use-kit-health";

export function KitSetupBanner({ mode = "swap" }: { mode?: "swap" | "bridge" }) {
  const { status, loading } = useKitHealth();

  if (loading || !status) return null;

  const bridgeBlocked =
    mode === "bridge" &&
    (!status.circleApiKeySet || !status.circleEntitySecretSet);
  const swapBlocked = mode === "swap" && !status.ok;

  if (!bridgeBlocked && !swapBlocked) return null;

  // Setup problems are the operator's to fix (see /api/health/kit); users
  // only need to know the feature is unavailable for now.
  const title = mode === "bridge" ? "Bridging is unavailable" : "Swaps are unavailable";

  return (
    <div
      className="mx-5 mt-4 rounded-2xl border px-4 py-3 text-sm"
      style={{
        background: "color-mix(in srgb, #F59E0B 10%, var(--glide-surface-elevated))",
        borderColor: "color-mix(in srgb, #F59E0B 35%, transparent)",
      }}
      role="status"
    >
      <p className="font-semibold text-[var(--glide-text)]">{title}</p>
      <p className="mt-1 leading-relaxed text-[var(--glide-muted)]">
        We&apos;re working on it. Your balance isn&apos;t affected; try again in a little while.
      </p>
    </div>
  );
}

export function useCircleReady(mode: "swap" | "bridge") {
  const { status, loading } = useKitHealth();
  if (loading || !status) return { ready: false, loading };
  if (mode === "swap") return { ready: status.ok, loading: false };
  return {
    ready: status.circleApiKeySet && status.circleEntitySecretSet,
    loading: false,
  };
}
