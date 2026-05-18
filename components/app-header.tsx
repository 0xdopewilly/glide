"use client";

import { GlideLogo } from "@/components/glide-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserAvatar } from "@/components/user-avatar";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export function AppHeader({
  title,
  backHref,
  onBack,
  showLogo = false,
}: {
  title?: string;
  backHref?: string;
  onBack?: () => void;
  showLogo?: boolean;
}) {
  const backControl = onBack ? (
    <button
      type="button"
      onClick={onBack}
      className="inline-flex items-center text-neutral-600 transition-colors hover:text-neutral-950 dark:text-white/75 dark:hover:text-white"
      aria-label="Back"
    >
      <ChevronLeft className="h-6 w-6" strokeWidth={2} />
    </button>
  ) : backHref ? (
    <Link
      href={backHref}
      className="inline-flex items-center text-neutral-600 transition-colors hover:text-neutral-950 dark:text-white/75 dark:hover:text-white"
      aria-label="Back"
    >
      <ChevronLeft className="h-6 w-6" strokeWidth={2} />
    </Link>
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
      <div className="flex shrink-0 items-center gap-2">
        <ThemeToggle />
        <UserAvatar size="sm" linked />
      </div>
    </header>
  );
}
