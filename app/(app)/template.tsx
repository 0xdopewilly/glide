"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export default function AppTemplate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPopRef = useRef(false);

  useEffect(() => {
    const onPop = () => {
      isPopRef.current = true;
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const animClass = isPopRef.current ? "" : "slide-from-right";

  useEffect(() => {
    isPopRef.current = false;
  }, [pathname]);

  return (
    <div
      key={pathname}
      className={`page-motion-panel flex min-h-0 flex-1 flex-col overflow-hidden ${animClass}`}
    >
      {children}
    </div>
  );
}
