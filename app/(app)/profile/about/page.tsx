"use client";

import { PageHeader } from "@/components/page-header";
import { SettingsIcon } from "@/components/settings-list";
import { ARC_NETWORK } from "@/lib/network";
import { KeyRound, Send, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const POINTS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Sparkles,
    title: "Set up for you",
    body: `glidepay creates a smart account for you on ${ARC_NETWORK.label} the first time you sign in. There's no browser extension to install and no seed phrase to write down.`,
  },
  {
    icon: KeyRound,
    title: "Keys secured by Circle",
    body: "Your account's keys are held by Circle and never shown in the app, much like a bank account. You can't import or export a recovery phrase.",
  },
  {
    icon: Send,
    title: "Your address is yours to share",
    body: `Anyone can send you money on ${ARC_NETWORK.label} using your address or your @pay tag. Payments on ${ARC_NETWORK.label} are final and can't be reversed, so always check who you're paying.`,
  },
];

export default function AboutAccountPage() {
  return (
    <>
      <PageHeader title="How your account works" backHref="/profile" />
      <div className="glide-scroll flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="glide-surface-card mt-4 shrink-0 rounded-2xl">
          {POINTS.map(({ icon, title, body }) => (
            <div key={title} className="flex gap-3 px-4 py-4">
              <SettingsIcon icon={icon} />
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold tracking-tight text-[var(--glide-text)]">
                  {title}
                </p>
                <p className="mt-1 text-[13.5px] leading-relaxed text-[var(--glide-muted)]">
                  {body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
