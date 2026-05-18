"use client";

import { BottomNav } from "@/components/bottom-nav";
import { GlideGradient } from "@/components/glide-gradient";
import { PageMotion } from "@/components/page-motion";
import { usePathname } from "next/navigation";

const FULL_BLEED_ROUTES = ["/send", "/receive", "/swap", "/bridge"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideNav = FULL_BLEED_ROUTES.some((r) => pathname.startsWith(r));

  return (
    <div className="glide-outer-frame min-h-dvh w-full md:flex md:items-center md:justify-center md:p-8">
      <GlideGradient className="fixed inset-0 md:hidden" />
      <div
        className="glide-glass-panel relative flex h-dvh w-full flex-col overflow-hidden md:my-8 md:h-[85vh] md:max-w-md md:rounded-[40px] md:shadow-2xl"
        style={{
          boxShadow:
            "0 24px 80px rgba(0,0,0,0.45), 0 0 0 1px color-mix(in srgb, var(--glide-border) 80%, transparent)",
        }}
      >
        <GlideGradient />
        <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
          <PageMotion>{children}</PageMotion>
        </div>
        {!hideNav && (
          <div className="relative z-10 shrink-0">
            <BottomNav />
          </div>
        )}
      </div>
    </div>
  );
}
