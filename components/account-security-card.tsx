"use client";

import { Shield, Wallet } from "lucide-react";

export function AccountSecurityCard() {
  return (
    <section className="mt-4 space-y-4 rounded-2xl p-4 glide-surface-card">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-indigo-500" strokeWidth={2} />
        <h3 className="text-sm font-semibold tracking-tight">
          How your account works
        </h3>
      </div>

      <ul
        className="space-y-3 text-sm leading-relaxed"
        style={{ color: "var(--glide-muted)" }}
      >
        <li className="flex gap-2">
          <Wallet className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <strong
              className="font-medium"
              style={{ color: "var(--glide-text)" }}
            >
              Automatic account:
            </strong>{" "}
            glidepay creates a smart account for you on Arc when you first open the
            app. You sign in with your profile. No browser extension and no
            seed phrase to write down.
          </span>
        </li>
        <li>
          <strong className="font-medium" style={{ color: "var(--glide-text)" }}>
            No private key export:
          </strong>{" "}
          Keys are secured by Circle and never shown in the app. This is by
          design, like a bank account, not a self custody wallet. You cannot
          import or export a recovery phrase.
        </li>
        <li>
          <strong className="font-medium" style={{ color: "var(--glide-text)" }}>
            Receive & copy:
          </strong>{" "}
          Your public address is yours to share. Anyone can send USDC to it on
          Arc testnet.
        </li>
      </ul>
    </section>
  );
}
