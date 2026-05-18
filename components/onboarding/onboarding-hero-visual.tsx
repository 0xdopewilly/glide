"use client";

import { GlideGMark } from "@/components/glide-g-mark";
import { motion, useReducedMotion } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;
const MARK_SIZE = 140;

export function OnboardingHeroVisual({ step }: { step: number }) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative flex items-center justify-center py-3">
      <motion.div
        key={`logo-${step}`}
        initial={{ opacity: 0, scale: 0.86, y: 18 }}
        animate={{
          opacity: 1,
          scale: 1,
          y: reduceMotion ? 0 : [0, -5, 0],
        }}
        transition={
          reduceMotion
            ? { duration: 0.45, ease }
            : {
                opacity: { duration: 0.45, ease },
                scale: { duration: 0.45, ease },
                y: { duration: 3.2, repeat: Infinity, ease: "easeInOut" },
              }
        }
      >
        <GlideGMark size={MARK_SIZE} glow={false} balanceGlyph priority />
      </motion.div>
    </div>
  );
}
