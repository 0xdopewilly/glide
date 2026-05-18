"use client";

import { motion } from "framer-motion";
import { useState } from "react";

const KEYS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  [".", "0", "back"],
] as const;

export function NumericKeypad({
  onKey,
}: {
  onKey: (key: string) => void;
}) {
  const [pulse, setPulse] = useState<string | null>(null);

  const press = (key: string) => {
    setPulse(key);
    window.setTimeout(() => setPulse(null), 120);
    onKey(key === "back" ? "back" : key);
  };

  return (
    <div className="grid grid-cols-3 gap-1.5 px-2 pb-2">
      {KEYS.flat().map((key) => (
        <motion.button
          key={key}
          type="button"
          onClick={() => press(key)}
          whileTap={{ scale: 0.9 }}
          animate={{
            scale: pulse === key ? 0.92 : 1,
            backgroundColor:
              pulse === key
                ? "color-mix(in srgb, var(--glide-accent) 18%, transparent)"
                : "transparent",
          }}
          transition={{ type: "spring", stiffness: 600, damping: 28 }}
          className="flex h-[3.25rem] items-center justify-center rounded-2xl text-[1.65rem] font-medium tracking-tight"
          style={{ color: "var(--glide-text)" }}
          aria-label={key === "back" ? "Delete" : key}
        >
          {key === "back" ? "⌫" : key}
        </motion.button>
      ))}
    </div>
  );
}
