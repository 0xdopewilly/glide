"use client";

import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

export function OnboardingContinueButton({
  label,
  onClick,
  className = "",
}: {
  label: string;
  onClick: () => void;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      whileTap={{ scale: 0.98 }}
      whileHover={{ scale: reduceMotion ? 1 : 1.01 }}
      className={`group flex w-full items-center justify-center gap-2.5 rounded-full bg-neutral-950 px-6 py-[1.05rem] text-[17px] font-semibold tracking-tight text-white shadow-[0_8px_28px_rgba(0,0,0,0.18)] transition-shadow hover:shadow-[0_12px_36px_rgba(0,0,0,0.22)] dark:bg-white dark:text-[#0a0a0a] dark:shadow-[0_8px_32px_rgba(255,255,255,0.12)] dark:hover:shadow-[0_12px_40px_rgba(255,255,255,0.18)] ${className}`}
      style={{ fontFamily: "var(--font-jakarta), var(--font-geist-sans), sans-serif" }}
    >
      <span>{label}</span>
      <motion.span
        className="flex items-center"
        animate={reduceMotion ? undefined : { x: [0, 5, 0] }}
        transition={
          reduceMotion
            ? undefined
            : { duration: 1.2, repeat: Infinity, ease: "easeInOut" }
        }
      >
        <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
      </motion.span>
    </motion.button>
  );
}
