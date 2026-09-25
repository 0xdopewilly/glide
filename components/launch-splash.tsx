"use client";

import { useEffect, useRef } from "react";

const WORD = "glidepay".split("");
const EXIT_AT_MS = 1300;
const EXIT_AT_REDUCED_MS = 500;
const LEAVE_MS = 420;

/** "glidepay" writes itself, letter by letter, then the splash opens onto the
 * app. Hidden by CSS unless <html data-splash> is set; tap to skip. The
 * writing is SVG stroke-dashoffset on a tiny element; the exit is
 * transform/opacity. */
export function LaunchSplash() {
  const leaveRef = useRef<() => void>(() => {});

  useEffect(() => {
    const root = document.documentElement;
    if (!root.hasAttribute("data-splash")) return;
    let done = false;
    const timers: number[] = [];
    const leave = () => {
      if (done) return;
      done = true;
      root.setAttribute("data-splash", "leaving");
      timers.push(window.setTimeout(() => root.removeAttribute("data-splash"), LEAVE_MS));
    };
    leaveRef.current = leave;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    timers.push(window.setTimeout(leave, reduced ? EXIT_AT_REDUCED_MS : EXIT_AT_MS));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  return (
    <div className="glide-splash" aria-hidden onClick={() => leaveRef.current()}>
      <svg viewBox="0 0 700 220" className="glide-splash-word">
        <text x="350" y="148" textAnchor="middle" className="glide-splash-text">
          {WORD.map((letter, i) => (
            <tspan
              key={i}
              style={{ animationDelay: `${i * 75}ms, ${560 + i * 45}ms` }}
            >
              {letter}
            </tspan>
          ))}
        </text>
      </svg>
    </div>
  );
}
