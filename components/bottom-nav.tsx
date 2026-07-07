"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  Home,
  Sparkles,
  UserCircle2,
  Wallet,
  Zap,
} from "lucide-react";

const SLOTS = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/payments", icon: Wallet, label: "Wallet" },
  { href: "/automations", icon: Zap, label: "Automate" },
  { href: "/ask", icon: Sparkles, label: "Discover" },
  { href: "/activity", icon: ArrowLeftRight, label: "Activity" },
  { href: "/profile", icon: UserCircle2, label: "Profile" },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-[color:var(--glide-surface-container)] pb-[max(env(safe-area-inset-bottom),0px)]"
      style={{ borderColor: "var(--glide-elevated-border)" }}
    >
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2 pt-2 pb-1">
        {SLOTS.map(({ href, icon: Icon, label }) => {
          const active =
            href === "/" ? pathname === "/" : pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className="group relative flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 transition-transform active:scale-95"
            >
              {active && (
                <span
                  aria-hidden
                  className="absolute inset-x-1 inset-y-0.5 -z-10 rounded-2xl"
                  style={{ backgroundColor: "var(--glide-primary-container)" }}
                />
              )}
              <Icon
                className={`h-5 w-5 ${active ? "" : "opacity-70"}`}
                style={{
                  color: active
                    ? "var(--glide-primary)"
                    : "var(--glide-on-surface-variant)",
                }}
                strokeWidth={active ? 2.5 : 2}
              />
              <span
                className="whitespace-nowrap text-[10px] font-semibold tracking-wide"
                style={{
                  color: active
                    ? "var(--glide-primary)"
                    : "var(--glide-on-surface-variant)",
                }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
