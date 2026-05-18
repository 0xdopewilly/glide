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
    <nav
      aria-label="Quick actions"
      className="mt-6 grid grid-cols-4 gap-2 px-1"
    >
      {ACTIONS.map(({ href, label, icon: Icon }) => (
        <ActionLink
          key={href}
          href={href}
          label={label}
          icon={<Icon className="h-[22px] w-[22px]" strokeWidth={2} />}
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
      className="group flex flex-col items-center gap-2 transition-transform active:scale-95"
    >
      <span
        className="flex h-14 w-14 items-center justify-center rounded-full text-white shadow-md transition-all group-hover:brightness-110 sm:h-[3.75rem] sm:w-[3.75rem]"
        style={{ background: "var(--glide-accent)" }}
      >
        {icon}
      </span>
      <span
        className="text-xs font-medium tracking-tight"
        style={{ color: "var(--glide-muted)" }}
      >
        {label}
      </span>
    </Link>
  );
}
