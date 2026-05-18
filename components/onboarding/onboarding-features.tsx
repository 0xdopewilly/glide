"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

const list = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const easeOut = [0.22, 1, 0.36, 1] as const;
const easePop = [0.34, 1.56, 0.64, 1] as const;

const row = {
  hidden: { opacity: 0, x: -10, filter: "blur(4px)" },
  show: {
    opacity: 1,
    x: 0,
    filter: "blur(0px)",
    transition: { duration: 0.45, ease: easeOut },
  },
};

const iconPop = {
  hidden: { scale: 0.85, opacity: 0 },
  show: {
    scale: 1,
    opacity: 1,
    transition: { duration: 0.35, ease: easePop },
  },
};

export function OnboardingFeatures({
  items,
}: {
  items: readonly { icon: LucideIcon; text: string }[];
}) {
  return (
    <motion.ul
      variants={list}
      initial="hidden"
      animate="show"
      className="relative mt-8 space-y-5 pl-1"
      aria-label="Why Glide"
    >
      <motion.span
        className="pointer-events-none absolute bottom-1 left-[15px] top-1 w-px origin-top"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--glide-accent) 35%, transparent) 0%, transparent 100%)",
        }}
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 0.6, delay: 0.25, ease: easeOut }}
        aria-hidden
      />

      {items.map(({ icon: Icon, text }) => (
        <motion.li
          key={text}
          variants={row}
          className="group relative flex items-center gap-3.5"
        >
          <motion.span
            variants={iconPop}
            className="relative flex h-8 w-8 shrink-0 items-center justify-center"
            style={{ color: "var(--glide-accent)" }}
          >
            <span
              className="absolute inset-0 rounded-lg opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{
                background:
                  "radial-gradient(circle, color-mix(in srgb, var(--glide-accent) 22%, transparent) 0%, transparent 70%)",
              }}
              aria-hidden
            />
            <Icon className="relative h-[17px] w-[17px]" strokeWidth={1.75} />
          </motion.span>
          <span className="text-[15px] font-normal leading-snug tracking-tight text-[color-mix(in_srgb,var(--glide-text)_88%,transparent)]">
            {text}
          </span>
        </motion.li>
      ))}
    </motion.ul>
  );
}
