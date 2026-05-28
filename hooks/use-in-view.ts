"use client";

import { useEffect, useRef, useState } from "react";

/** Fire-once IntersectionObserver hook. Returns a ref + boolean that flips to
 * true the first time the element scrolls into view. Used for fade-up-on-scroll
 * effects without the cost of framer-motion's whileInView on every node. */
export function useInView<T extends Element = HTMLDivElement>(
  options?: { rootMargin?: string; threshold?: number },
): { ref: React.RefObject<T | null>; inView: boolean } {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            observer.disconnect();
            return;
          }
        }
      },
      {
        rootMargin: options?.rootMargin ?? "0px 0px -10% 0px",
        threshold: options?.threshold ?? 0.1,
      },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [options?.rootMargin, options?.threshold]);

  return { ref, inView };
}
