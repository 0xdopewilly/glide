"use client";

import Lenis from "lenis";
import { useEffect } from "react";

/** Wraps a section in Lenis smooth-scroll. Active for the lifetime of the
 * mounted children, then cleaned up. Scoped (not app-wide) because Lenis can
 * fight iOS native momentum on fast-scroll surfaces like the activity feed. */
export function LenisProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.05,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      // iOS Safari handles touch natively well; don't interfere.
      syncTouch: false,
    });

    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
