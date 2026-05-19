"use client";

import { useState } from "react";

const KEYS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  [".", "0", "back"],
] as const;

export function NumericKeypad({ onKey }: { onKey: (key: string) => void }) {
  const [pulse, setPulse] = useState<string | null>(null);

  const press = (key: string) => {
    setPulse(key);
    window.setTimeout(() => setPulse(null), 100);
    onKey(key === "back" ? "back" : key);
  };

  return (
    <div className="grid grid-cols-3 gap-1.5 px-2 pb-2">
      {KEYS.flat().map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => press(key)}
          className={`glide-tap flex h-[3.25rem] items-center justify-center rounded-2xl text-[1.65rem] font-medium tracking-tight transition-colors duration-100 ${
            pulse === key ? "bg-[color-mix(in_srgb,var(--glide-accent)_18%,transparent)]" : ""
          }`}
          style={{ color: "var(--glide-text)" }}
          aria-label={key === "back" ? "Delete" : key}
        >
          {key === "back" ? "⌫" : key}
        </button>
      ))}
    </div>
  );
}
