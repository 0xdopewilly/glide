"use client";

import { Home, List, ScanLine, Sparkles, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Home", icon: Home },
  { href: "/scan", label: "Scan", icon: ScanLine },
  { href: "/ask", label: "Ask", icon: Sparkles },
  { href: "/activity", label: "Activity", icon: List },
  { href: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="mx-2 mb-[max(0.75rem,env(safe-area-inset-bottom))] shrink-0 rounded-full bg-neutral-100/95 px-0.5 py-1.5 backdrop-blur-xl dark:bg-[#1c1c1e]/95 dark:ring-1 dark:ring-white/10"
      aria-label="Main"
    >
      <ul className="flex items-center justify-between">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          const isAsk = href === "/ask";
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                prefetch
                className={`glide-tap mx-0.5 flex flex-col items-center gap-0.5 rounded-full px-1 py-2 transition-[background-color,color] duration-200 ease-out ${
                  active
                    ? isAsk
                      ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-sm"
                      : "bg-white text-neutral-950 shadow-sm dark:bg-white dark:text-[#0a0a0a]"
                    : "text-neutral-500 dark:text-white/45"
                }`}
              >
                <Icon
                  className={`h-[1.15rem] w-[1.15rem] ${active ? "stroke-[2.5]" : "stroke-2"}`}
                />
                <span className="text-[9px] font-semibold tracking-tight">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
