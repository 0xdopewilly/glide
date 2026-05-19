"use client";

import { ArrowUpRight, Download } from "lucide-react";
import Link from "next/link";

const ACTIONS = [
  {
    href: "/receive",
    label: "Receive",
    description: "Get USDC on Arc",
    icon: Download,
  },
  {
    href: "/send",
    label: "Send",
    description: "Pay out",
    icon: ArrowUpRight,
  },
] as const;

export function ActionGrid() {
  return (
    <nav
      aria-label="Quick actions"
      className="mt-6 grid grid-cols-2 gap-3"
    >
      {ACTIONS.map(({ href, label, description, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          prefetch
          className="glide-tap group flex min-h-[4.5rem] flex-col justify-between rounded-2xl bg-neutral-100/95 px-3.5 py-3 ring-1 ring-black/[0.04] transition-[background-color,transform] duration-200 hover:bg-neutral-200/90 active:scale-[0.98] dark:bg-[#1c1c1e]/95 dark:ring-white/[0.08] dark:hover:bg-[#252528]"
        >
          <div className="flex w-full items-start justify-between gap-1">
            <span className="text-[15px] font-semibold tracking-tight text-neutral-950 dark:text-white">
              {label}
            </span>
            <Icon
              className="h-4 w-4 shrink-0 text-neutral-400 transition-colors group-hover:text-neutral-600 dark:text-white/35 dark:group-hover:text-white/55"
              strokeWidth={2.25}
            />
          </div>
          <span className="text-left text-[11px] font-medium text-neutral-500 dark:text-white/40">
            {description}
          </span>
        </Link>
      ))}
    </nav>
  );
}
