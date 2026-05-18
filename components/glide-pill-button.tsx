"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

/** Primary CTA — matches onboarding Continue button. */
export function GlidePillButton({
  children,
  onClick,
  disabled,
  type = "button",
  className = "",
  icon,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
  icon?: ReactNode;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      whileHover={{ scale: disabled || reduceMotion ? 1 : 1.01 }}
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-semibold tracking-tight text-white shadow-[0_6px_20px_rgba(0,0,0,0.15)] transition-shadow hover:shadow-[0_8px_28px_rgba(0,0,0,0.2)] disabled:opacity-45 dark:bg-white dark:text-[#0a0a0a] dark:shadow-[0_6px_24px_rgba(255,255,255,0.1)] dark:hover:shadow-[0_8px_32px_rgba(255,255,255,0.14)] ${className}`}
      style={{ fontFamily: "var(--font-jakarta), var(--font-geist-sans), sans-serif" }}
    >
      {children}
      {icon}
    </motion.button>
  );
}
