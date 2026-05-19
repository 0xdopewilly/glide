"use client";

import { usePrivacy } from "@/context/privacy-context";
import { useWallet } from "@/context/wallet-context";
import {
  ArrowLeftRight,
  Clock,
  Home,
  Sparkles,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV: {
  href: string;
  label: string;
  icon: typeof Home;
  assist?: boolean;
}[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/payments", label: "Payments", icon: Wallet },
  { href: "/ask", label: "Glide Assist", icon: Sparkles, assist: true },
  { href: "/trade", label: "Trade", icon: ArrowLeftRight },
  { href: "/activity", label: "Activity", icon: Clock },
];

function formatNavBalance(balance: number, hidden: boolean) {
  if (hidden) return "hidden";
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
      className="mx-2 mb-[max(0.75rem,env(safe-area-inset-bottom))] shrink-0 rounded-full bg-neutral-100/95 px-1.5 py-1.5 backdrop-blur-xl dark:bg-[#1c1c1e]/95 dark:ring-1 dark:ring-white/10"
      aria-label="Main"
    >
      <ul className="flex items-center justify-between gap-0.5">
        {NAV.map(({ href, label, icon: Icon, assist }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          const homeLabel =
            href === "/"
              ? `Home, balance ${balanceLabel}`
              : label;

          return (
            <li key={href} className="flex flex-1 justify-center">
              <Link
                href={href}
                prefetch
                aria-label={homeLabel}
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
