"use client";

import { getSlideDirection } from "@/lib/route-motion";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useRef } from "react";

const EASE = [0.22, 1, 0.36, 1] as const;

const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? "100%" : "-100%",
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (dir: number) => ({
    x: dir > 0 ? "-28%" : "28%",
    opacity: 0,
  }),
};

/** Horizontal slide transitions between routes (Cash App–style). */
export function PageMotion({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const prevPath = useRef(pathname);
  const direction = useRef(1);
  const reduceMotion = useReducedMotion();

  if (pathname !== prevPath.current) {
    direction.current = getSlideDirection(prevPath.current, pathname);
    prevPath.current = pathname;
  }

  if (reduceMotion) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <AnimatePresence initial={false} custom={direction.current} mode="popLayout">
        <motion.div
          key={pathname}
          custom={direction.current}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.26, ease: EASE }}
          className="absolute inset-0 flex min-h-0 flex-col overflow-hidden bg-inherit"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
