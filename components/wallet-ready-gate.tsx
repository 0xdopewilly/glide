"use client";

import { useWallet } from "@/context/wallet-context";
import { readCachedWallet } from "@/lib/wallet-cache";
import { motion } from "framer-motion";
import { Shield } from "lucide-react";

export function WalletReadyGate({ children }: { children: React.ReactNode }) {
  const { wallet, loading, error, ensureWallet } = useWallet();
  const cachedWallet =
    typeof window !== "undefined" ? readCachedWallet() : null;

  // Cached or loaded wallet — show app (refresh revalidates in background).
  if (wallet ?? cachedWallet) {
    return <>{children}</>;
  }

  // Still loading first-time setup — full-screen gate only when no wallet yet.
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex min-h-0 flex-1 flex-col items-center justify-center px-8 py-16 text-center"
      >
        <div className="relative flex h-16 w-16 items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.1, ease: "linear" }}
            className="absolute inset-0 rounded-full border-[3px] border-t-transparent"
            style={{ borderColor: "var(--glide-accent)" }}
          />
          <Shield className="relative h-6 w-6 glide-accent-text" strokeWidth={2} />
        </div>
        <h2 className="mt-8 text-xl font-semibold tracking-tight">
          Setting up your balance
        </h2>
        <p className="mt-2 max-w-[16rem] text-sm leading-relaxed glide-muted">
          Creating your smart account on Arc. This only takes a moment.
        </p>
      </motion.div>
    );
  }

  // Setup failed with no cached wallet.
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex min-h-0 flex-1 flex-col items-center justify-center px-8 py-16 text-center"
    >
      <Shield className="h-6 w-6 glide-accent-text" strokeWidth={2} />
      <h2 className="mt-8 text-xl font-semibold tracking-tight">
        Couldn&apos;t load your wallet
      </h2>
      <p className="mt-2 max-w-[16rem] text-sm leading-relaxed glide-muted">
        {error ?? "Something went wrong. Please try again."}
      </p>
      <button
        type="button"
        onClick={() => void ensureWallet()}
        className="mt-6 text-sm font-semibold glide-accent-text"
      >
        Try again
      </button>
    </motion.div>
  );
}
