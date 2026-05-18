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
      className="inline-flex items-center"
      style={{ color: "var(--glide-accent)" }}
      aria-label="Back"
    >
      <ChevronLeft className="h-6 w-6" strokeWidth={2} />
    </button>
  ) : backHref ? (
    <Link
      href={backHref}
      className="inline-flex items-center"
      style={{ color: "var(--glide-accent)" }}
      aria-label="Back"
    >
      <ChevronLeft className="h-6 w-6" strokeWidth={2} />
    </Link>
  ) : showLogo ? (
    <div className="flex items-center gap-2.5">
      <GlideLogo size="sm" linked />
      <span className="text-lg font-semibold tracking-tight">Glide</span>
    </div>
  ) : (
    <span className="w-6" />
  );

  return (
    <header className="relative z-10 flex shrink-0 items-center justify-between gap-3 border-b border-[var(--glide-border)] bg-[color-mix(in_srgb,var(--glide-shell)_75%,transparent)] px-4 py-3 backdrop-blur-xl">
      <div className="min-w-0 flex-1">{backControl}</div>
      {title ? (
        <h1 className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-[17px] font-semibold tracking-tight">
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
