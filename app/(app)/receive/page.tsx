"use client";

import { CopyButton } from "@/components/copy-button";
import { FlowPage } from "@/components/flow-page";
import { UserAvatar } from "@/components/user-avatar";
import { useWallet } from "@/context/wallet-context";

export default function ReceivePage() {
  const { wallet, loading, profile } = useWallet();
  const address = wallet?.address ?? "";

  return (
    <FlowPage title="Receive" backHref="/">
      <div className="flex flex-col px-5 pb-8">
        <div className="mt-8 flex flex-col items-center text-center">
          <UserAvatar size="lg" />
          <p className="mt-4 text-xl font-semibold tracking-tight">
            {profile.displayName.trim() || "Guest"}
          </p>
          <p className="mt-1 text-sm glide-muted">Share your address to get paid</p>
        </div>

        <div
          className="mt-10 rounded-2xl border px-4 py-5 glide-surface-card"
        >
          <p className="text-xs font-medium uppercase tracking-[0.1em] glide-muted">
            Your address
          </p>
          <p className="mt-3 break-all font-mono text-sm leading-relaxed">
            {loading && !address
              ? "Loading your account"
              : address || "Account not ready"}
          </p>
        </div>

        <CopyButton
          value={address}
          label="Copy address"
          className="mt-6 w-full"
        />
      </div>
    </FlowPage>
  );
}
