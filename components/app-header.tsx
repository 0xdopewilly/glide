"use client";

import { headerIconButtonClassName } from "@/components/header-icon-button";
import { NotificationBell } from "@/components/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserAvatar } from "@/components/user-avatar";
import { useGoBack } from "@/lib/use-go-back";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export function AppHeader({
  title,
  /** Fallback route if there is no browser history (e.g. deep link). */
  backHref,
  backFallback,
  onBack,
  showBack = false,
  showLogo = false,
  showNotifications = false,
}: {
  title?: string;
  backHref?: string;
  backFallback?: string;
  onBack?: () => void;
  showBack?: boolean;
  showLogo?: boolean;
  showNotifications?: boolean;
}) {
  const fallback = backFallback ?? backHref ?? "/";
  const goBack = useGoBack(fallback);

  const backControl = onBack ? (
    <button
      type="button"
      onClick={onBack}
      className={headerIconButtonClassName()}
      aria-label="Back"
    >
      <ChevronLeft className="h-5 w-5" strokeWidth={2.25} />
    </button>
  ) : showBack || backHref || backFallback ? (
    <button
      type="button"
      onClick={goBack}
      className={headerIconButtonClassName()}
      aria-label="Back"
    >
      <ChevronLeft className="h-5 w-5" strokeWidth={2.25} />
    </button>
  ) : showLogo ? (
    <Link
      href="/"
      className="glide-tap inline-flex min-w-0 items-center rounded-full py-1 transition-opacity hover:opacity-90"
      aria-label="glidepay home"
    >
      <span className="text-[22px] font-black tracking-[-0.04em] text-[var(--glide-text)]">
        glidepay<span className="text-[var(--glide-accent)]">.</span>
      </span>
    </Link>
  ) : (
    <span className="h-10 w-10 shrink-0" aria-hidden />
  );

  return (
    <header className="relative z-10 flex shrink-0 items-center justify-between gap-3 px-5 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="flex min-w-0 flex-1 items-center">{backControl}</div>

      {title ? (
        <h1 className="pointer-events-none absolute left-1/2 max-w-[42%] -translate-x-1/2 truncate text-center text-[17px] font-semibold tracking-[-0.02em]">
          {title}
        </h1>
      ) : null}

      <div
        className="glide-m3-toolbar flex shrink-0 items-center gap-0.5 p-0.5"
        role="toolbar"
        aria-label="Account actions"
      >
        {showNotifications ? <NotificationBell /> : null}
        <ThemeToggle />
        <UserAvatar size="sm" linked />
      </div>
    </header>
  );
}
