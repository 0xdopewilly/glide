"use client";

import { GlidePillButton } from "@/components/glide-pill-button";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ScanError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("[Glide] scan page error");
  }, []);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
      <p className="text-lg font-semibold tracking-tight">Scan couldn&apos;t load</p>
      <p className="mt-2 text-sm glide-muted">
        Camera may be blocked. You can still paste an address on the send screen.
      </p>
      <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
        <GlidePillButton onClick={reset} className="w-full justify-center py-3.5">
          Try again
        </GlidePillButton>
        <button
          type="button"
          onClick={() => router.push("/send")}
          className="glide-tap w-full rounded-full border border-neutral-200 py-3.5 text-sm font-semibold dark:border-white/15"
        >
          Go to send
        </button>
      </div>
    </div>
  );
}
