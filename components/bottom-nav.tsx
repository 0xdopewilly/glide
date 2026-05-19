"use client";

import { usePrivacy } from "@/context/privacy-context";
import { useWallet } from "@/context/wallet-context";
import { resolveWalletTotalUsd } from "@/lib/tokens";
import { ArrowLeftRight, Clock, Sparkles, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

const ICON_NAV: {
  href: string;
  label: string;
  icon: typeof Wallet;
  assist?: boolean;
}[] = [
  { href: "/payments", label: "Payments", icon: Wallet },
  { href: "/ask", label: "Glide Assist", icon: Sparkles, assist: true },
  { href: "/trade", label: "Trade", icon: ArrowLeftRight },
  { href: "/activity", label: "Activity", icon: Clock },
];

function formatNavBalance(amount: number) {
  if (amount >= 100) return `$${Math.round(amount)}`;
  if (amount >= 10) return `$${amount.toFixed(0)}`;
  return `$${amount.toFixed(2)}`;
}

export function BottomNav() {
  const pathname = usePathname();
  const { tokens, balance } = useWallet();
  const { hideBalance } = usePrivacy();
  const totalUsd = useMemo(
    () => resolveWalletTotalUsd(tokens, balance),
    [tokens, balance],
  );
  const balanceLabel = hideBalance ? "•••" : formatNavBalance(totalUsd);
  const homeActive = pathname === "/";

  return (
    <nav
      className="mx-2 mb-[max(0.75rem,env(safe-area-inset-bottom))] shrink-0 rounded-full bg-neutral-100/95 px-1.5 py-1.5 backdrop-blur-xl dark:bg-[#1c1c1e]/95 dark:ring-1 dark:ring-white/10"
      aria-label="Main"
    >
      <ul className="flex items-center justify-between gap-0.5">
        <li className="flex flex-1 justify-center">
          <Link
            href="/"
            prefetch
            aria-label={`Home, balance ${balanceLabel}`}
            aria-current={homeActive ? "page" : undefined}
            className={`glide-tap flex h-11 min-w-[2.75rem] items-center justify-center rounded-full px-2.5 transition-[background-color,color,box-shadow] duration-200 ease-out ${
              homeActive
                ? "bg-white text-neutral-950 shadow-sm dark:bg-white dark:text-[#0a0a0a]"
                : "text-neutral-800 dark:text-white/80"
            }`}
          >
            <span
              className={`font-bold tabular-nums tracking-tight ${
                balanceLabel.length > 6 ? "text-[12px]" : "text-[14px]"
              }`}
            >
              {balanceLabel}
            </span>
          </Link>
        </li>

        {ICON_NAV.map(({ href, label, icon: Icon, assist }) => {
          const active = pathname.startsWith(href);

          return (
            <li key={href} className="flex flex-1 justify-center">
              <Link
                href={href}
                prefetch
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className={`glide-tap flex h-11 w-11 items-center justify-center rounded-full transition-[background-color,color,box-shadow,transform] duration-200 ease-out ${
                  active
                    ? assist
                      ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/30"
                      : "bg-white text-neutral-950 shadow-sm dark:bg-white dark:text-[#0a0a0a]"
                    : "text-neutral-700 dark:text-white/70"
                } ${assist && !active ? "text-violet-600 dark:text-violet-300" : ""}`}
              >
                <Icon
                  className={`h-[1.35rem] w-[1.35rem] ${active ? "stroke-[2.5]" : "stroke-[2]"}`}
                  strokeWidth={active ? 2.5 : 2}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
