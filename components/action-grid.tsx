"use client";

import { ArrowDown, ArrowLeftRight, ArrowUp, Workflow } from "lucide-react";
import Link from "next/link";

const ACTIONS = [
  { href: "/receive", label: "Receive", icon: ArrowDown },
  { href: "/send", label: "Send", icon: ArrowUp },
  { href: "/swap", label: "Swap", icon: ArrowLeftRight },
  { href: "/bridge", label: "Bridge", icon: Workflow },
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
            className="flex h-14 w-14 items-center justify-center rounded-full border bg-[color:var(--glide-surface-elevated)] text-[color:var(--glide-on-elevated)] transition-colors group-hover:bg-[var(--glide-surface-container-high)]"
            style={{ borderColor: "var(--glide-elevated-border)" }}
          >
            <Icon className="h-5 w-5" strokeWidth={2} />
          </span>
          <span className="glide-label-mono text-[10px] font-semibold text-[color:var(--glide-on-surface-variant)]">
            {label}
          </span>
        </Link>
      ))}
    </nav>
  );
}
