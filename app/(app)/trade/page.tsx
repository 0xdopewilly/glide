"use client";

import { PageHeader } from "@/components/page-header";
import { ArrowLeftRight, ChevronRight, Workflow } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

type TradeAction = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

const TRADE_ACTIONS: TradeAction[] = [
  {
    href: "/swap",
    title: "Swap",
    description: "Convert between USDC, EURC, and cirBTC on Arc.",
    icon: ArrowLeftRight,
  },
  {
    href: "/bridge",
    title: "Bridge",
    description: "Move USDC across chains.",
    icon: Workflow,
  },
];

export default function TradePage() {
  return (
    <>
      <PageHeader title="Trade" />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-8">
        <p className="mt-1 text-sm text-[var(--glide-muted)]">
          Swap stablecoins or bridge to other networks.
        </p>
        <ul className="glide-stagger mt-5 flex flex-col gap-3">
          {TRADE_ACTIONS.map(({ href, title, description, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                prefetch
                className="glide-tap block rounded-3xl border p-5"
                style={{
                  background: "var(--glide-surface-elevated)",
                  borderColor: "var(--glide-border)",
                }}
              >
                <div className="flex items-center gap-4">
                  <span
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border"
                    style={{
                      background: "var(--glide-surface-container)",
                      borderColor: "var(--glide-border)",
                      color: "var(--glide-text)",
                    }}
                  >
                    <Icon className="h-6 w-6" strokeWidth={2} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[17px] font-bold tracking-tight text-[var(--glide-text)]">
                      {title}
                    </p>
                    <p className="mt-1 text-[13px] text-[var(--glide-muted)]">
                      {description}
                    </p>
                  </div>
                  <ChevronRight
                    className="h-5 w-5 shrink-0 text-[var(--glide-muted)]"
                    strokeWidth={2}
                  />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
