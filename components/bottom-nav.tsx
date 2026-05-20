"use client";

import { usePrivacy } from "@/context/privacy-context";
import { useWallet } from "@/context/wallet-context";
import { ArrowLeftRight, Clock, Sparkles, Wallet } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

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

const TAP_SPRING = { type: "spring" as const, stiffness: 520, damping: 28, mass: 0.55 };
const INDICATOR_SPRING = { type: "spring" as const, stiffness: 420, damping: 34, mass: 0.45 };

function formatNavBalance(amount: number) {
  if (amount >= 100) return `$${Math.round(amount)}`;
  if (amount >= 10) return `$${amount.toFixed(0)}`;
  return `$${amount.toFixed(2)}`;
}

function NavIndicator({
  active,
  variant,
}: {
  active: boolean;
  variant: "balance" | "default";
}) {
  if (!active) return null;

  return (
    <motion.span
      layoutId="bottom-nav-indicator"
      className={`absolute inset-x-4 top-0 h-[2px] rounded-full ${
        variant === "balance"
          ? "bg-[var(--glide-success)]"
          : "bg-neutral-950 dark:bg-white"
      }`}
      transition={INDICATOR_SPRING}
      aria-hidden
    />
  );
}

function NavTap({
  children,
  reduceMotion,
}: {
  children: ReactNode;
  reduceMotion: boolean | null;
}) {
  return (
    <motion.span
      className="relative flex w-full items-center justify-center"
      whileTap={reduceMotion ? undefined : { scale: 0.88 }}
      transition={TAP_SPRING}
    >
      {children}
    </motion.span>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const { totalUsd } = useWallet();
  const { hideBalance } = usePrivacy();
  const reduceMotion = useReducedMotion();
  const balanceLabel = hideBalance ? "•••" : formatNavBalance(totalUsd);
  const homeActive = pathname === "/";

  return (
    <nav
      className="w-full shrink-0 border-t border-neutral-200/90 bg-white/98 backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#0a0a0a]/98"
      aria-label="Main"
    >
      <ul className="flex h-[3.35rem] items-stretch px-0.5 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-0.5">
        <li className="flex min-w-0 flex-1">
          <Link
            href="/"
            prefetch
            aria-label={`Home, balance ${balanceLabel}`}
            aria-current={homeActive ? "page" : undefined}
            className={`glide-nav-tap relative flex w-full px-1 transition-colors duration-200 ${
              homeActive
                ? "text-[var(--glide-success)]"
                : "text-neutral-500 dark:text-white/45"
            }`}
          >
            <NavTap reduceMotion={reduceMotion}>
              <NavIndicator active={homeActive} variant="balance" />
              <span
                className={`font-bold tabular-nums tracking-tight ${
                  balanceLabel.length > 6 ? "text-[13px]" : "text-[15px]"
                }`}
              >
                {balanceLabel}
              </span>
            </NavTap>
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
                className={`glide-nav-tap relative flex w-full px-1 transition-colors duration-200 ${
                  active
                    ? "text-neutral-950 dark:text-white"
                    : "text-neutral-500 dark:text-white/45"
                }`}
              >
                <NavTap reduceMotion={reduceMotion}>
                  <NavIndicator active={active} variant="default" />
                  <motion.span
                    animate={{ scale: active && !reduceMotion ? 1.04 : 1 }}
                    transition={INDICATOR_SPRING}
                  >
                    <Icon
                      className="h-[23px] w-[23px]"
                      strokeWidth={active ? 2.35 : 2}
                    />
                  </motion.span>
                </NavTap>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
