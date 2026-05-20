"use client";

import { BottomNav } from "@/components/bottom-nav";
import { GlideGradient } from "@/components/glide-gradient";
import { usePathname } from "next/navigation";

const FULL_BLEED_ROUTES = ["/send", "/receive", "/swap", "/bridge", "/request", "/pay"];

const jakarta = "var(--font-jakarta), var(--font-geist-sans), system-ui, sans-serif";

/** Exact route or child path only — avoids `/payments` matching `/pay`. */
function isFullBleedRoute(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideNav = FULL_BLEED_ROUTES.some((r) => isFullBleedRoute(pathname, r));

  return (
    <div
      className="app-shell-root relative flex min-h-dvh w-full flex-col md:items-center md:justify-center md:p-8"
      style={{ background: "var(--glide-bg)" }}
    >
      <div className="glide-app-frame relative flex h-dvh w-full max-w-md flex-col overflow-hidden md:h-[85vh] md:rounded-[var(--glide-radius-xl)] md:shadow-2xl md:ring-1 md:ring-black/5 dark:md:ring-white/10">
        <GlideGradient
          intensity="vivid"
          className="pointer-events-none absolute inset-0 opacity-100 transition-opacity duration-500"
        />
        <div
          className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden"
          style={{ fontFamily: jakarta }}
        >
          {children}
        </div>
        {!hideNav ? (
          <div className="relative z-10 mt-auto w-full shrink-0">
            <BottomNav />
          </div>
        ) : null}
      </div>
    </div>
  );
}
