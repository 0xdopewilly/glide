"use client";

import { GlideGradient } from "@/components/glide-gradient";
import { ThemeToggle } from "@/components/theme-toggle";

export function OnboardingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="glide-outer-frame relative flex min-h-dvh w-full flex-col md:items-center md:justify-center md:p-8">
      <GlideGradient className="fixed inset-0 md:absolute md:inset-8 md:rounded-[48px]" />

      <div
        className="glide-glass-panel relative flex h-dvh w-full max-w-md flex-col overflow-hidden md:h-[85vh] md:rounded-[40px]"
        style={{
          boxShadow:
            "0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px color-mix(in srgb, var(--glide-border) 80%, transparent)",
        }}
      >
        <GlideGradient />
        <div className="absolute right-4 top-4 z-20">
          <ThemeToggle />
        </div>
        <div className="relative z-10 flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}
