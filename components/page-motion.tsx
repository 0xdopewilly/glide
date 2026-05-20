"use client";

import { getSlideDirection } from "@/lib/route-motion";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

/** Short ease-out — no overshoot (stable on mobile GPUs). */
const EASE = [0.25, 0.1, 0.25, 1] as const;
const DURATION = 0.22;

type RouteFrame = { path: string; node: ReactNode };

const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? "100%" : "-100%",
  }),
  center: { x: 0 },
  exit: (dir: number) => ({
    x: dir > 0 ? "-22%" : "22%",
  }),
};

/**
 * Freezes each route's React tree so exit animations don't show the *next* page
 * (classic App Router + AnimatePresence jitter).
 */
export function PageMotion({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const prevPath = useRef(pathname);
  const direction = useRef(1);
  const cache = useRef<Map<string, ReactNode>>(new Map());

  cache.current.set(pathname, children);

  const [frames, setFrames] = useState<RouteFrame[]>([
    { path: pathname, node: children },
  ]);

  useLayoutEffect(() => {
    const node = cache.current.get(pathname) ?? children;

    if (pathname === prevPath.current) {
      setFrames((prev) =>
        prev.map((f) => (f.path === pathname ? { path: pathname, node } : f)),
      );
      return;
    }

    direction.current = getSlideDirection(prevPath.current, pathname);
    prevPath.current = pathname;

    setFrames((prev) => {
      if (prev.some((f) => f.path === pathname)) {
        return prev.map((f) => (f.path === pathname ? { path: pathname, node } : f));
      }
      return [...prev, { path: pathname, node }];
    });
  }, [pathname, children]);

  const onExitComplete = useCallback(() => {
    const node = cache.current.get(pathname) ?? children;
    setFrames([{ path: pathname, node }]);
  }, [pathname, children]);

  if (reduceMotion) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
    );
  }

  return (
    <div className="page-motion-viewport relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <AnimatePresence
        initial={false}
        mode="sync"
        custom={direction.current}
        onExitComplete={onExitComplete}
      >
        {frames.map((frame) => (
          <motion.div
            key={frame.path}
            custom={direction.current}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: DURATION, ease: EASE }}
            className="page-motion-panel absolute inset-0 flex min-h-0 flex-col overflow-hidden bg-white dark:bg-[#0a0a0a]"
          >
            {frame.node}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
