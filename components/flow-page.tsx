"use client";

import { AppHeader } from "@/components/app-header";

/** Shared layout for send / receive / swap / bridge screens. */
export function FlowPage({
  title,
  backHref = "/",
  onBack,
  children,
}: {
  title?: string;
  backHref?: string;
  onBack?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <AppHeader title={title} backHref={onBack ? undefined : backHref} onBack={onBack} />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
    </div>
  );
}
