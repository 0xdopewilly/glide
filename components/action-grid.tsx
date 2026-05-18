"use client";

import {
  ArrowLeftRight,
  Download,
  Link2,
  Send,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

const ACTIONS = [
  { href: "/send", label: "Send", icon: Send },
  { href: "/receive", label: "Receive", icon: Download },
  { href: "/swap", label: "Swap", icon: ArrowLeftRight },
  { href: "/bridge", label: "Bridge", icon: Link2 },
] as const;

export function ActionGrid() {
  return (
    <nav aria-label="Quick actions" className="mt-8 grid grid-cols-4 gap-3">
      {ACTIONS.map(({ href, label, icon: Icon }) => (
        <ActionLink
          key={href}
          href={href}
          label={label}
          icon={<Icon className="h-[21px] w-[21px]" strokeWidth={2} />}
        />
      ))}
    </nav>
  );
}

function ActionLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col items-center gap-2.5 transition-transform active:scale-95"
    >
      <span className="flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-full bg-neutral-100 text-neutral-900 ring-1 ring-black/[0.04] transition-colors group-hover:bg-neutral-200 dark:bg-[#1c1c1e] dark:text-white dark:ring-white/10 dark:group-hover:bg-[#2a2a2e] sm:h-14 sm:w-14">
        {icon}
      </span>
      <span className="text-[11px] font-semibold tracking-tight text-neutral-500 dark:text-white/55">
        {label}
      </span>
    </Link>
  );
}
