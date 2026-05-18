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
      className="shrink-0 border-t border-[var(--glide-border)] bg-[color-mix(in_srgb,var(--glide-shell)_80%,transparent)] px-6 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl"
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
                className="flex flex-col items-center gap-1 px-4 py-2"
                style={{
                  color: active ? "var(--glide-text)" : "var(--glide-muted)",
                }}
              >
                <Icon
                  className={`h-6 w-6 ${active ? "stroke-[2.5]" : "stroke-2"}`}
                  style={active ? { color: "var(--glide-accent)" } : undefined}
                />
                <span
                  className="text-[10px] font-medium tracking-tight"
                  style={active ? { color: "var(--glide-accent)" } : undefined}
                >
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
