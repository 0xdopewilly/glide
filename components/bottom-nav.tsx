"use client";

import { Home, List, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Home", icon: Home },
  { href: "/activity", label: "Activity", icon: List },
  { href: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="mx-4 mb-[max(0.75rem,env(safe-area-inset-bottom))] shrink-0 rounded-full bg-neutral-100/95 px-2 py-2 backdrop-blur-xl dark:bg-[#1c1c1e]/95 dark:ring-1 dark:ring-white/10"
      aria-label="Main"
    >
      <ul className="flex items-center justify-around">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                prefetch
                className={`flex flex-col items-center gap-0.5 rounded-full px-5 py-2 transition-colors ${
                  active
                    ? "bg-white text-neutral-950 shadow-sm dark:bg-white dark:text-[#0a0a0a]"
                    : "text-neutral-500 dark:text-white/45"
                }`}
              >
                <Icon
                  className={`h-5 w-5 ${active ? "stroke-[2.5]" : "stroke-2"}`}
                />
                <span className="text-[10px] font-semibold tracking-tight">
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
