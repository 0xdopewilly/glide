"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Wallet, Sparkles, Clock, ArrowLeftRight } from "lucide-react";

const SLOTS = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/payments", icon: Wallet, label: "Payments" },
  { href: "/ask", icon: Sparkles, label: "Billy" },
  { href: "/activity", icon: Clock, label: "Activity" },
  { href: "/trade", icon: ArrowLeftRight, label: "Trade" },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 pb-[max(env(safe-area-inset-bottom),12px)]">
      <div className="pointer-events-auto mx-auto flex max-w-md items-center justify-between gap-2 px-5">
        {SLOTS.map(({ href, icon: Icon, label }) => {
          const active =
            href === "/" ? pathname === "/" : pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={`relative flex h-11 w-11 items-center justify-center rounded-full border transition-colors ${
                active
                  ? "bg-[#4ADE80]/15 ring-1 ring-[#4ADE80]/35"
                  : "bg-[color:var(--glide-surface-elevated)]"
              }`}
              style={
                active
                  ? { borderColor: "transparent" }
                  : { borderColor: "var(--glide-elevated-border)" }
              }
            >
              <Icon
                className={`h-5 w-5 ${
                  active
                    ? "text-[#4ADE80]"
                    : "text-[color:var(--glide-on-elevated-variant)]"
                }`}
                strokeWidth={2.25}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
