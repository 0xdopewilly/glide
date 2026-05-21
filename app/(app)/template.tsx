"use client";

import { useLiteMotion } from "@/hooks/use-lite-motion";
import { getSlideDirection } from "@/lib/route-motion";
import { GLIDE_DURATION, GLIDE_EASE } from "@/lib/motion-tokens";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useRef } from "react";

/**
 * Next.js remounts this template on each tab change. One enter-only slide —
 * no AnimatePresence exit/enter pair (that caused the double-frame flash).
 */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const liteMotion = useLiteMotion();
  const prevPath = useRef(pathname);
  const direction = useRef(1);

  if (pathname !== prevPath.current) {
    direction.current = getSlideDirection(prevPath.current, pathname);
    prevPath.current = pathname;
  }

  if (liteMotion) {
    return (
      <motion.div
        key={pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.12, ease: GLIDE_EASE }}
        className="page-motion-panel flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        {children}
      </motion.div>
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
