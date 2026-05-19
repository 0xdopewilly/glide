"use client";

import { AppHeader } from "@/components/app-header";

/** Shared layout for send / receive / swap / bridge screens. */
export function FlowPage({
  title,
  backFallback,
  backHref,
  onBack,
  showBack = true,
  children,
}: {
  title?: string;
  /** Used only when there is no history to go back to. */
  backFallback?: string;
  /** @deprecated Use backFallback */
  backHref?: string;
  onBack?: () => void;
  showBack?: boolean;
  children: React.ReactNode;
}) {
  const fallback = backFallback ?? backHref ?? "/";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <AppHeader
        title={title}
        onBack={onBack}
        showBack={showBack && !onBack}
        backFallback={fallback}
      />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
    </div>
  );
}
