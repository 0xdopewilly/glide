"use client";

import { usePrivacy } from "@/context/privacy-context";
import { useBalance } from "@/context/wallet-context";
import { ArrowLeftRight, Clock, Sparkles, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { memo } from "react";

const ICON_NAV: {
  href: string;
  label: string;
  icon: typeof Wallet;
}[] = [
  { href: "/payments", label: "Payments", icon: Wallet },
  { href: "/ask", label: "Glide Assist", icon: Sparkles },
  { href: "/trade", label: "Trade", icon: ArrowLeftRight },
  { href: "/activity", label: "Activity", icon: Clock },
];

function formatNavBalance(amount: number) {
  if (amount >= 100) return `$${Math.round(amount)}`;
  if (amount >= 10) return `$${amount.toFixed(0)}`;
  return `$${amount.toFixed(2)}`;
}

function BottomNavInner() {
  const pathname = usePathname();
  const { totalUsd } = useBalance();
  const { hideBalance } = usePrivacy();
  const balanceLabel = hideBalance ? "•••" : formatNavBalance(totalUsd);
  const homeActive = pathname === "/";

  return (
    <nav className="glide-m3-nav w-full shrink-0" aria-label="Main">
      <ul className="flex h-[3.5rem] items-stretch px-1 pb-[max(0.45rem,env(safe-area-inset-bottom))] pt-1">
        <li className="flex min-w-0 flex-1">
          <Link
            href="/"
            prefetch
            aria-label={`Home, balance ${balanceLabel}`}
            aria-current={homeActive ? "page" : undefined}
            className={`glide-nav-tap relative flex w-full px-0.5 transition-colors duration-150 ${
              homeActive
                ? "text-[var(--glide-success)]"
                : "text-[var(--glide-on-nav-inactive)]"
            }`}
          >
            {homeActive ? (
              <span
                className="glide-m3-nav-pill glide-m3-nav-pill--success absolute inset-x-1.5 inset-y-1"
                aria-hidden
              />
            ) : null}
            <span className="relative z-10 flex w-full items-center justify-center">
              <span
                className={`font-bold tabular-nums tracking-tight ${
                  balanceLabel.length > 6 ? "text-[13px]" : "text-[15px]"
                }`}
              >
                {balanceLabel}
              </span>
            </span>
          </Link>
        </li>

        {ICON_NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);

          return (
            <li key={href} className="flex min-w-0 flex-1">
              <Link
                href={href}
                prefetch
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className={`glide-nav-tap relative flex w-full px-0.5 transition-colors duration-150 ${
                  active ? "text-[var(--glide-text)]" : "text-[var(--glide-on-nav-inactive)]"
                }`}
              >
                {active ? (
                  <span
                    className="glide-m3-nav-pill absolute inset-x-1.5 inset-y-1"
                    aria-hidden
                  />
                ) : null}
                <span className="relative z-10 flex w-full items-center justify-center">
                  <Icon
                    className="h-[23px] w-[23px]"
                    strokeWidth={active ? 2.35 : 2}
                  />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export const BottomNav = memo(BottomNavInner);
