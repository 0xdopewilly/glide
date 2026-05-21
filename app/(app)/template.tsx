"use client";

import { getSlideDirection } from "@/lib/route-motion";
import { usePathname } from "next/navigation";
import { useRef } from "react";

/** Tab enter — CSS only, subtle directional slide (transform + opacity). */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const prevPath = useRef(pathname);
  const direction = getSlideDirection(prevPath.current, pathname);

  if (pathname !== prevPath.current) {
    prevPath.current = pathname;
  }

  return (
    <div
      key={pathname}
      data-tab-dir={direction > 0 ? "forward" : "back"}
      className="page-motion-panel glide-tab-enter flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      {children}
    </div>
  );
}
