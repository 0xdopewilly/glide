"use client";

import { BottomNav } from "@/components/bottom-nav";
import { GlideGradient } from "@/components/glide-gradient";
import { PageMotion } from "@/components/page-motion";
import { usePathname } from "next/navigation";

const FULL_BLEED_ROUTES = ["/send", "/receive", "/swap", "/bridge"];

const jakarta = "var(--font-jakarta), var(--font-geist-sans), system-ui, sans-serif";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideNav = FULL_BLEED_ROUTES.some((r) => pathname.startsWith(r));

  return (
    <div className="app-shell-root relative flex min-h-dvh w-full flex-col bg-neutral-100 dark:bg-black md:items-center md:justify-center md:p-8">
      <div className="relative flex h-dvh w-full max-w-md flex-col overflow-hidden bg-white text-neutral-950 dark:bg-black dark:text-white md:h-[85vh] md:rounded-[32px] md:shadow-2xl md:ring-1 md:ring-black/5 dark:md:ring-white/10">
        <GlideGradient
          intensity="vivid"
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 dark:opacity-100"
        />
        <div
          className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden"
          style={{ fontFamily: jakarta }}
        >
          <PageMotion>{children}</PageMotion>
        </div>
        {!hideNav ? (
          <div className="relative z-10 shrink-0">
            <BottomNav />
          </div>
        ) : null}
      </div>
    </div>
  );
}
