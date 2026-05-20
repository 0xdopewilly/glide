"use client";

import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

export function OnboardingContinueButton({
  label,
  onClick,
  step = 0,
  className = "",
}: {
  label: string;
  onClick: () => void;
  step?: number;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const stepClass = `onboarding-continue--${Math.min(step, 2)}`;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      whileTap={{ scale: 0.98 }}
      whileHover={{ scale: reduceMotion ? 1 : 1.01 }}
      className={`onboarding-continue ${stepClass} ${className}`}
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
