"use client";

import { ViewTransition } from "react";

/**
 * Authenticated-shell template: native push/pop screen transitions (the user
 * asked for them, 2026-09-25). React's <ViewTransition> has the browser
 * snapshot the old and new screen and animate the snapshots on the GPU — no
 * remount keys, no animation libraries. Direction lives on <html data-nav>
 * (components/app-shell.tsx); the motion itself is CSS in app/globals.css.
 * Tabs stay instant. Browsers without view transitions just switch screens.
 *
 * The screen carries the page background so its snapshot is opaque (a sliding
 * transparent snapshot would show the old screen through it).
 */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition name="glide-screen">
      <div className="glide-bg-wash flex min-h-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </ViewTransition>
  );
}
