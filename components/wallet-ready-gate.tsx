"use client";

import { useWallet } from "@/context/wallet-context";
import { motion } from "framer-motion";
import { Shield } from "lucide-react";

export function WalletReadyGate({ children }: { children: React.ReactNode }) {
  const { wallet, loading, error, ensureWallet } = useWallet();

  if (wallet) {
    return <>{children}</>;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex min-h-0 flex-1 flex-col items-center justify-center px-8 py-16 text-center"
    >
      <motion.div
        animate={loading ? { rotate: 360 } : { rotate: 0 }}
        transition={
          loading
            ? { repeat: Infinity, duration: 1.1, ease: "linear" }
            : { duration: 0 }
        }
        className="relative flex h-16 w-16 items-center justify-center"
      >
        {loading ? (
          <div
            className="absolute inset-0 rounded-full border-[3px] border-t-transparent"
            style={{ borderColor: "var(--glide-accent)" }}
          />
        ) : null}
        <Shield className="relative h-6 w-6 glide-accent-text" strokeWidth={2} />
      </motion.div>
      <h2 className="mt-8 text-xl font-semibold tracking-tight">
        Setting up your balance
      </h2>
      <p className="mt-2 max-w-[16rem] text-sm leading-relaxed glide-muted">
        {error
          ? error
          : "Creating your smart account on Arc. This only takes a moment."}
      </p>
      {error ? (
        <button
          type="button"
          onClick={() => void ensureWallet()}
          className="mt-6 text-sm font-semibold glide-accent-text"
        >
          Try again
        </button>
      ) : null}
    </motion.div>
  );
}
