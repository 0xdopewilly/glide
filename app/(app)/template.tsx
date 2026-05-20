"use client";

import { getSlideDirection } from "@/lib/route-motion";
import { GLIDE_DURATION, GLIDE_EASE } from "@/lib/motion-tokens";
import { motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useRef } from "react";

/**
 * Next.js remounts this template on each tab change. One enter-only slide —
 * no AnimatePresence exit/enter pair (that caused the double-frame flash).
 */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const prevPath = useRef(pathname);
  const direction = useRef(1);

  if (pathname !== prevPath.current) {
    direction.current = getSlideDirection(prevPath.current, pathname);
    prevPath.current = pathname;
  }

  if (reduceMotion) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
    );
  }

  const dir = direction.current;

  return (
    <motion.div
      key={pathname}
      initial={{ x: dir > 0 ? "100%" : "-100%" }}
      animate={{ x: 0 }}
      transition={{ duration: GLIDE_DURATION, ease: GLIDE_EASE }}
      className="page-motion-panel flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      {children}
    </motion.div>
  );
}
