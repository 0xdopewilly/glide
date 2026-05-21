"use client";

import { GlideGradient } from "@/components/glide-gradient";

export function OnboardingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="onboarding-shell-root relative flex min-h-dvh w-full flex-col md:items-center md:justify-center md:p-8">
      <div className="glide-app-frame relative flex h-dvh w-full max-w-md flex-col overflow-hidden md:h-[85vh] md:rounded-[var(--glide-radius-xl)] md:border md:border-[var(--glide-border)] md:shadow-2xl">
        <GlideGradient className="opacity-[0.5] dark:opacity-[0.75]" />
        <div className="relative z-10 flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}
