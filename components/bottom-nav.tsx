"use client";

import { usePrivacy } from "@/context/privacy-context";
import { useWallet } from "@/context/wallet-context";
import {
  ArrowLeftRight,
  Clock,
  Sparkles,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { kind: "home" as const, href: "/" },
  { kind: "link" as const, href: "/payments", label: "Pay", icon: Wallet },
  { kind: "assist" as const, href: "/ask", label: "Assist", icon: Sparkles },
  { kind: "link" as const, href: "/trade", label: "Trade", icon: ArrowLeftRight },
  { kind: "link" as const, href: "/activity", label: "Activity", icon: Clock },
] as const;

function formatNavBalance(balance: number, hidden: boolean) {
  if (hidden) return "•••";
  if (balance >= 100) return `$${Math.round(balance)}`;
  if (balance >= 10) return `$${balance.toFixed(0)}`;
  return `$${balance.toFixed(2)}`;
}

export function BottomNav() {
  const pathname = usePathname();
  const { balance } = useWallet();
  const { hideBalance } = usePrivacy();
  const balanceLabel = formatNavBalance(balance, hideBalance);

  return (
    <nav
      className="mx-2 mb-[max(0.75rem,env(safe-area-inset-bottom))] shrink-0 rounded-full bg-neutral-100/95 px-1 py-1.5 backdrop-blur-xl dark:bg-[#1c1c1e]/95 dark:ring-1 dark:ring-white/10"
      aria-label="Main"
    >
      <ul className="flex items-center justify-between">
        {NAV.map((item) => {
          if (item.kind === "home") {
            const active = pathname === "/";
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href="/"
                  prefetch
                  aria-label={`Home, balance ${balanceLabel}`}
                  aria-current={active ? "page" : undefined}
                  className={`glide-tap mx-0.5 flex flex-col items-center justify-center rounded-full px-2 py-2 transition-[background-color,color] duration-200 ease-out ${
                    active
                      ? "bg-white text-neutral-950 shadow-sm dark:bg-white dark:text-[#0a0a0a]"
                      : "text-neutral-500 dark:text-white/45"
                  }`}
                >
                  <span
                    className={`font-bold tabular-nums tracking-tight ${
                      active ? "text-[15px]" : "text-[14px]"
                    }`}
                  >
                    {balanceLabel}
                  </span>
                </Link>
              </li>
            );
          }

          const active = pathname.startsWith(item.href);
          const isAssist = item.kind === "assist";
          const Icon = item.icon;

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                prefetch
                aria-current={active ? "page" : undefined}
                className={`glide-tap mx-0.5 flex flex-col items-center gap-0.5 rounded-full px-1 py-2 transition-[background-color,color,transform] duration-200 ease-out ${
                  active
                    ? isAssist
                      ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/25"
                      : "bg-white text-neutral-950 shadow-sm dark:bg-white dark:text-[#0a0a0a]"
                    : "text-neutral-500 dark:text-white/45"
                } ${isAssist && !active ? "scale-[1.02]" : ""}`}
              >
                <Icon
                  className={`h-[1.15rem] w-[1.15rem] ${active ? "stroke-[2.5]" : "stroke-2"}`}
                />
                <span className="text-[9px] font-semibold tracking-tight">
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
