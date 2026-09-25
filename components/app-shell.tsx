"use client";

import { BottomNav } from "@/components/bottom-nav";
import { GlideGradient } from "@/components/glide-gradient";
import { PinGate } from "@/components/pin-gate";
import { navDirection } from "@/lib/nav-direction";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef } from "react";

// Flows and pushed screens (back arrow, no tab bar). Tabs: /, /payments,
// /automations, /profile.
const FULL_BLEED_ROUTES = [
  "/send",
  "/receive",
  "/swap",
  "/bridge",
  "/request",
  "/pay",
  "/profile/details",
  "/profile/about",
  "/activity",
  "/contacts",
  "/notifications",
  "/search",
  "/ask",
  "/thread",
];

const jakarta = "var(--font-jakarta), var(--font-geist-sans), system-ui, sans-serif";

/** Exact route or child path only - avoids `/payments` matching `/pay`. */
function isFullBleedRoute(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

/** Sets <html data-nav="push|pop|tab"> for each navigation, read by the
 * screen-transition CSS. It runs as a layout effect, inside the commit the
 * view transition wraps, so the direction is in place before the browser
 * animates. It's cleared shortly after, so an unrelated later transition
 * (e.g. a data refresh) never replays a slide. */
function useNavDirection(pathname: string) {
  const prevRef = useRef(pathname);
  const poppedRef = useRef(false);
  const clearRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const onPop = () => {
      poppedRef.current = true;
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useLayoutEffect(() => {
    const dir = navDirection(prevRef.current, pathname, poppedRef.current);
    prevRef.current = pathname;
    poppedRef.current = false;
    if (!dir) return;
    const root = document.documentElement;
    root.dataset.nav = dir;
    window.clearTimeout(clearRef.current);
    clearRef.current = window.setTimeout(() => {
      delete root.dataset.nav;
    }, 600);
  }, [pathname]);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideNav = FULL_BLEED_ROUTES.some((r) => isFullBleedRoute(pathname, r));
  useNavDirection(pathname);

  return (
    <div
      className="app-shell-root relative flex min-h-dvh w-full flex-col md:items-center md:justify-center md:p-8"
      style={{ background: "var(--glide-bg)" }}
    >
      <div className="glide-app-frame relative flex h-dvh w-full max-w-md flex-col overflow-hidden md:h-[85vh] md:rounded-[var(--glide-radius-xl)] md:shadow-2xl md:ring-1 md:ring-black/5 dark:md:ring-white/10">
        <GlideGradient className="opacity-100" />
        <div
          className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden"
          style={{ fontFamily: jakarta }}
        >
          {children}
        </div>
        {!hideNav ? (
          <div className="relative z-10 w-full shrink-0" style={{ fontFamily: jakarta }}>
            <BottomNav />
          </div>
        ) : null}
        <PinGate />
      </div>
    </div>
  );
}
