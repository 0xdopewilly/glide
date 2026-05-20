"use client";

import { getSlideDirection } from "@/lib/route-motion";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useMemo, useRef, useState } from "react";

/** Snappy ease-out — short distance, no overshoot. */
const SNAP_EASE = [0.32, 0.72, 0, 1] as const;
const SLIDE_MS = 0.24;

const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? "100%" : "-100%",
    zIndex: 2,
  }),
  center: {
    x: 0,
    zIndex: 2,
  },
  exit: (dir: number) => ({
    x: dir > 0 ? "-18%" : "18%",
    zIndex: 1,
  }),
};

/** Horizontal slide transitions between main tabs (Cash App–style). */
export function PageMotion({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const prevPath = useRef(pathname);
  const [direction, setDirection] = useState(1);
  const reduceMotion = useReducedMotion();

  useLayoutEffect(() => {
    if (pathname === prevPath.current) return;
    setDirection(getSlideDirection(prevPath.current, pathname));
    prevPath.current = pathname;
  }, [pathname]);

  const transition = useMemo(
    () => ({
      x: { duration: SLIDE_MS, ease: SNAP_EASE },
    }),
    [],
  );

  if (reduceMotion) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
    );
  }

  return (
    <div className="page-motion-viewport relative isolate flex min-h-0 flex-1 flex-col overflow-hidden">
      <AnimatePresence initial={false} custom={direction} mode="sync">
        <motion.div
          key={pathname}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={transition}
          className="page-motion-panel absolute inset-0 z-10 flex min-h-0 flex-col overflow-hidden bg-inherit"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
