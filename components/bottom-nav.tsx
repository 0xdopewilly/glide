"use client";

import { useProfile } from "@/context/wallet-context";
import { haptics } from "@/lib/haptics";
import { ArrowLeftRight, House, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Four tabs, per the reference design: Home · Payments · Automate · Profile.
// Billy lives on Home (Smart Assistant card); other screens are pushed.
const SLOTS: { href: string; label: string; icon?: LucideIcon }[] = [
  { href: "/", icon: House, label: "Home" },
  { href: "/payments", icon: ArrowLeftRight, label: "Payments" },
  { href: "/automations", icon: Zap, label: "Automate" },
  { href: "/profile", label: "Profile" },
];

/** White tab bar in the page flow (not fixed): content ends exactly at its
 * top edge, and it carries the iPhone home-indicator inset itself. */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="relative z-40 shrink-0 rounded-t-[26px] px-2 pt-1.5 pb-[max(var(--glide-safe-bottom),8px)]"
      style={{
        background: "var(--glide-nav-surface)",
        boxShadow: "0 -10px 30px rgba(24, 16, 80, 0.14)",
      }}
    >
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {SLOTS.map(({ href, icon: Icon, label }) => {
          const active = href === "/" ? pathname === "/" : pathname?.startsWith(href);
          const color = active ? "var(--glide-nav-active)" : "var(--glide-nav-inactive)";
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              onClick={() => {
                if (!active) haptics.light();
              }}
              className="flex min-h-[50px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-1.5 transition-transform active:scale-95"
            >
              {href === "/payments" ? (
                // Filled circle with arrows, like the reference's Transfer tab.
                <span
                  className="flex h-[23px] w-[23px] items-center justify-center rounded-full"
                  style={{ background: color }}
                  aria-hidden
                >
                  <ArrowLeftRight className="h-[13px] w-[13px] text-white" strokeWidth={2.75} />
                </span>
              ) : Icon ? (
                <Icon
                  className="h-[23px] w-[23px]"
                  style={{ color }}
                  fill={active ? "currentColor" : "none"}
                  strokeWidth={active ? 2.25 : 2}
                />
              ) : (
                <ProfileTabIcon active={Boolean(active)} />
              )}
              <span className="whitespace-nowrap text-[11px] font-semibold" style={{ color }}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function ProfileTabIcon({ active }: { active: boolean }) {
  const { profile } = useProfile();
  const initial = (profile.displayName?.trim().charAt(0) || "G").toUpperCase();
  return (
    <span
      className="relative flex h-[24px] w-[24px] items-center justify-center overflow-hidden rounded-full text-[11px] font-bold text-white"
      style={{
        background: "linear-gradient(135deg, #8B6CF6 0%, #5B3DF5 100%)",
        boxShadow: active
          ? "0 0 0 2px var(--glide-nav-surface), 0 0 0 4px var(--glide-nav-active)"
          : undefined,
      }}
      aria-hidden
    >
      {profile.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        initial
      )}
    </span>
  );
}
