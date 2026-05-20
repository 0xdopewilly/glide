"use client";

import { getSlideDirection } from "@/lib/route-motion";
import {
  GLIDE_DURATION,
  GLIDE_EASE,
} from "@/lib/motion-tokens";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useRef, type ReactNode } from "react";

const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? "100%" : "-100%",
  }),
  center: { x: 0 },
  exit: (dir: number) => ({
    x: dir > 0 ? "-100%" : "100%",
  }),
};

/** One slide at a time: left tab → slide right, right tab → slide left. */
export function PageMotion({ children }: { children: ReactNode }) {
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
    <div className="page-motion-viewport relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <AnimatePresence initial={false} mode="wait" custom={dir}>
        <motion.div
          key={pathname}
          custom={dir}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: GLIDE_DURATION, ease: GLIDE_EASE }}
          className="page-motion-panel flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
