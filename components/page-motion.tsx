"use client";

import { usePathname } from "next/navigation";

/** Lightweight route fade — CSS only (no layout-affecting x slides). */
export function PageMotion({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div key={pathname} className="page-motion-shell flex min-h-0 flex-1 flex-col overflow-hidden">
      {children}
    </div>
  );
}
