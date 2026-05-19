"use client";

import { GlideLogo } from "@/components/glide-logo";
import { NotificationBell } from "@/components/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserAvatar } from "@/components/user-avatar";
import { useGoBack } from "@/lib/use-go-back";
import { ChevronLeft } from "lucide-react";

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
      className="inline-flex items-center text-neutral-600 transition-colors hover:text-neutral-950 dark:text-white/75 dark:hover:text-white"
      aria-label="Back"
    >
      <ChevronLeft className="h-6 w-6" strokeWidth={2} />
    </button>
  ) : showBack || backHref || backFallback ? (
    <button
      type="button"
      onClick={goBack}
      className="inline-flex items-center text-neutral-600 transition-colors hover:text-neutral-950 dark:text-white/75 dark:hover:text-white"
      aria-label="Back"
    >
      <ChevronLeft className="h-6 w-6" strokeWidth={2} />
    </button>
  ) : showLogo ? (
    <div className="flex items-center gap-2.5">
      <GlideLogo size="sm" linked glow={false} />
      <span className="text-lg font-bold tracking-[-0.02em]">Glide</span>
    </div>
  ) : (
    <span className="w-6" />
  );

  return (
    <header className="relative z-10 flex shrink-0 items-center justify-between gap-3 px-6 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="min-w-0 flex-1">{backControl}</div>
      {title ? (
        <h1 className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-[17px] font-semibold tracking-[-0.02em]">
          {title}
        </h1>
      ) : null}
      <div className="flex shrink-0 items-center gap-1">
        {showNotifications ? <NotificationBell /> : null}
        <ThemeToggle />
        <UserAvatar size="sm" linked />
      </div>
    </header>
  );
}
