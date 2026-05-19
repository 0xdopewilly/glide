"use client";

import { PageHeader } from "@/components/page-header";
import { ArrowLeftRight, ChevronRight, Link2 } from "lucide-react";
import Link from "next/link";

const TRADE_ACTIONS = [
  {
    href: "/swap",
    title: "Swap",
    description: "Convert USDC ↔ EURC on Arc",
    icon: ArrowLeftRight,
    accent: "from-sky-500/15 to-blue-500/20 text-sky-600 dark:text-sky-300",
  },
  {
    href: "/bridge",
    title: "Bridge",
    description: "Move assets across chains",
    icon: Link2,
    accent: "from-violet-500/15 to-indigo-500/20 text-violet-600 dark:text-violet-300",
  },
] as const;

export default function TradePage() {
  return (
    <>
      <PageHeader title="Trade" />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-8">
        <p className="mt-1 text-sm glide-muted">
          Swap stablecoins or bridge to other networks.
        </p>
        <ul className="mt-5 flex flex-col gap-3">
          {TRADE_ACTIONS.map(({ href, title, description, icon: Icon, accent }) => (
            <li key={href}>
              <Link
                href={href}
                prefetch
                className="glide-tap block rounded-2xl p-5 glide-surface-card"
              >
                <div className="flex items-start gap-4">
                  <span
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${accent}`}
                  >
                    <Icon className="h-6 w-6" strokeWidth={2} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold tracking-tight">{title}</p>
                    <p className="mt-1 text-sm glide-muted">{description}</p>
                  </div>
                  <ChevronRight className="mt-1 h-5 w-5 shrink-0 glide-muted" strokeWidth={2} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
