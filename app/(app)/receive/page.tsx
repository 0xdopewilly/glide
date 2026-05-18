"use client";

import { CopyButton } from "@/components/copy-button";
import { FlowPage } from "@/components/flow-page";
import { ReceiveQr } from "@/components/receive-qr";
import { UserAvatar } from "@/components/user-avatar";
import { useWallet } from "@/context/wallet-context";
import { Share2 } from "lucide-react";

export default function ReceivePage() {
  const { wallet, loading, profile } = useWallet();
  const address = wallet?.address ?? "";

  const share = async () => {
    if (!address) return;
    const text = `Pay me on Glide: ${address}`;
    if (navigator.share) {
      await navigator.share({ title: "Glide", text });
      return;
    }
    await navigator.clipboard.writeText(address);
  };

  return (
    <FlowPage title="Receive" backHref="/">
      <div className="flex flex-col px-5 pb-8">
        <div className="mt-6 flex flex-col items-center text-center">
          <UserAvatar size="lg" />
          <p className="mt-4 text-xl font-semibold tracking-tight">
            {profile.displayName.trim() || "Guest"}
          </p>
          <p className="mt-1 text-sm glide-muted">Scan or share to get paid</p>
        </div>

        <ReceiveQr address={address} />

        <div className="mt-6 rounded-2xl border px-4 py-5 glide-surface-card">
          <p className="text-xs font-medium uppercase tracking-[0.1em] glide-muted">
            Your address
          </p>
          <p className="mt-3 break-all font-mono text-sm leading-relaxed">
            {loading && !address
              ? "Loading your account"
              : address || "Account not ready"}
          </p>
        </div>

        <CopyButton value={address} label="Copy address" className="mt-4 w-full" />

        <button
          type="button"
          onClick={() => void share()}
          disabled={!address}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border py-3.5 text-sm font-semibold transition-opacity disabled:opacity-40"
          style={{
            borderColor: "var(--glide-border)",
            color: "var(--glide-text)",
          }}
        >
          <Share2 className="h-4 w-4" />
          Share address
        </button>
      </div>
    </FlowPage>
  );
}
