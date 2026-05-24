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
    const text = `Pay me on glidepay: ${address}`;
    if (navigator.share) {
      await navigator.share({ title: "glidepay", text });
      return;
    }
    await navigator.clipboard.writeText(address);
  };

  return (
    <FlowPage title="Receive" backHref="/">
      <div className="slide-up-bouncy flex flex-col px-5 pb-8">
        <div className="mt-6 flex flex-col items-center text-center">
          <UserAvatar size="lg" />
          <p className="mt-4 text-[20px] font-semibold tracking-tight text-[var(--glide-text)]">
            {profile.displayName.trim() || "Guest"}
          </p>
          <p className="glide-label-mono mt-2 text-[11px] font-semibold text-[var(--glide-muted)]">
            Share your address · USDC or EURC on Arc
          </p>
        </div>

        <ReceiveQr address={address} />

        <div
          className="mt-6 rounded-2xl border px-4 py-5"
          style={{
            background: "var(--glide-surface-elevated)",
            borderColor: "var(--glide-border)",
          }}
        >
          <p className="glide-label-mono text-[11px] font-semibold text-[var(--glide-muted)]">
            Your address
          </p>
          <p className="mt-3 break-all font-mono text-sm leading-relaxed text-[var(--glide-text)]">
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
          className="glide-tap glide-label-mono mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border py-3.5 text-[11px] font-semibold transition-opacity disabled:opacity-40"
          style={{
            background: "var(--glide-accent)",
            color: "var(--glide-bg)",
            borderColor: "var(--glide-accent)",
          }}
        >
          <Share2 className="h-4 w-4" />
          Share address
        </button>
      </div>
    </FlowPage>
  );
}
