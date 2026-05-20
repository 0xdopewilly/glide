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
    description: "Pay a tag or wallet",
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
          className="glide-tonal-card glide-tap group flex min-h-[4.5rem] flex-col justify-between px-3.5 py-3 active:scale-[0.98]"
        >
          <div className="flex w-full items-start justify-between gap-1">
            <span className="text-[15px] font-semibold tracking-tight text-[var(--glide-text)]">
              {label}
            </span>
            <Icon
              className="h-4 w-4 shrink-0 text-[var(--glide-muted)] transition-colors group-hover:text-[var(--glide-text)]"
              strokeWidth={2.25}
            />
          </div>
          <span className="glide-muted text-left text-[11px] font-medium">
            {description}
          </span>
        </Link>
      ))}
    </nav>
  );
}
