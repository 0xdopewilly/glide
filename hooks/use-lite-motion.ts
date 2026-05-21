"use client";

import { useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

function isAppleMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/** Lighter animations off iOS Safari — keeps iPhone smooth, helps Android & desktop Chrome. */
export function useLiteMotion(): boolean {
  const reduceMotion = useReducedMotion();
  const [lite, setLite] = useState(false);

  useEffect(() => {
    const coarse = window.matchMedia("(hover: none) and (pointer: coarse)");
    const update = () => {
      if (isAppleMobile()) {
        setLite(false);
        return;
      }
      const cores = navigator.hardwareConcurrency ?? 8;
      const lowMem =
        "deviceMemory" in navigator &&
        typeof navigator.deviceMemory === "number" &&
        navigator.deviceMemory <= 4;
      setLite(coarse.matches || cores <= 6 || lowMem);
    };
    update();
    coarse.addEventListener("change", update);
    return () => coarse.removeEventListener("change", update);
  }, []);

  return Boolean(reduceMotion) || lite;
}
