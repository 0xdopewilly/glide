"use client";

import { usePrivacy } from "@/context/privacy-context";

export function PrivacySettings() {
  const { hideBalance, blurAmounts, setHideBalance, setBlurAmounts } = usePrivacy();

  return (
    <div className="rounded-2xl border border-neutral-200/80 p-4 dark:border-white/10">
      <p className="text-sm font-semibold tracking-tight">Privacy</p>
      <label className="mt-4 flex cursor-pointer items-center justify-between gap-3">
        <span className="text-sm glide-muted">Hide balance on home</span>
        <input
          type="checkbox"
          checked={hideBalance}
          onChange={(e) => setHideBalance(e.target.checked)}
          className="h-5 w-5 rounded accent-violet-600"
        />
      </label>
      <label className="mt-3 flex cursor-pointer items-center justify-between gap-3">
        <span className="text-sm glide-muted">Blur amounts in activity</span>
        <input
          type="checkbox"
          checked={blurAmounts}
          onChange={(e) => setBlurAmounts(e.target.checked)}
          className="h-5 w-5 rounded accent-violet-600"
        />
      </label>
    </div>
  );
}
