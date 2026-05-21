"use client";

import { useKitHealth } from "@/hooks/use-kit-health";
import Link from "next/link";

export function KitSetupBanner({ mode = "swap" }: { mode?: "swap" | "bridge" }) {
  const { status, loading } = useKitHealth();

  if (loading || !status) return null;

  const bridgeBlocked =
    mode === "bridge" &&
    (!status.circleApiKeySet || !status.circleEntitySecretSet);
  const swapBlocked = mode === "swap" && !status.ok;

  if (!bridgeBlocked && !swapBlocked) return null;

  const title =
    mode === "bridge"
      ? "Bridge needs Circle API credentials"
      : "Swap needs a valid Circle Kit Key";
  const body =
    mode === "bridge"
      ? "Set CIRCLE_API_KEY and CIRCLE_ENTITY_SECRET on Vercel (same app as your wallet), then redeploy."
      : (status.hint ??
        "Add CIRCLE_KIT_KEY (KIT_KEY:id:secret) from Circle Console, then redeploy.");

  return (
    <div className="mx-5 mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
      <p className="font-medium text-amber-50">{title}</p>
      <p className="mt-1.5 leading-relaxed text-amber-100/90">{body}</p>
      {mode === "swap" ? (
        <p className="mt-2 text-xs text-amber-100/75">
          Kit Key must be from the same Circle app as{" "}
          <span className="font-mono">CIRCLE_API_KEY</span>. After updating Vercel env vars,
          redeploy, then{" "}
          <Link href="/api/health/kit" className="underline underline-offset-2" target="_blank">
            verify /api/health/kit
          </Link>
          .
        </p>
      ) : null}
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
