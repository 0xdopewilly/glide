"use client";

import { ArrowDown, ArrowLeftRight, ArrowUp, Link2 } from "lucide-react";
import Link from "next/link";

const ACTIONS = [
  { href: "/receive", label: "Receive", icon: ArrowDown },
  { href: "/send", label: "Send", icon: ArrowUp },
  { href: "/swap", label: "Swap", icon: ArrowLeftRight },
  { href: "/bridge", label: "Bridge", icon: Link2 },
] as const;

export function ActionGrid() {
  return (
    <nav
      aria-label="Quick actions"
      className="glide-stagger mt-6 flex items-start justify-between gap-2"
    >
      {ACTIONS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          prefetch
          className="glide-tap group flex flex-1 flex-col items-center gap-2"
        >
          <span
            className="flex h-14 w-14 items-center justify-center rounded-full bg-[color:var(--glide-surface-container)] border border-[color:var(--glide-primary)]/15 ring-1 ring-[color:var(--glide-primary)]/10 text-[color:var(--glide-primary)] transition-all duration-200 group-hover:ring-[color:var(--glide-primary)]/25 group-hover:scale-105"
          >
            <Icon className="h-[22px] w-[22px]" strokeWidth={2} />
          </span>
          <span className="text-sm font-medium text-[color:var(--glide-on-surface)]">
            {label}
          </span>
        </Link>
      ))}
    </nav>
  );
}
