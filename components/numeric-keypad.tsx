"use client";

import { Delete } from "lucide-react";

const KEYS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  [".", "0", "back"],
] as const;

export function NumericKeypad({ onKey }: { onKey: (key: string) => void }) {
  const press = (key: string) => {
    onKey(key === "back" ? "back" : key);
  };

  return (
    <div className="glide-keypad grid grid-cols-3 gap-1 px-1 pb-1">
      {KEYS.flat().map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => press(key)}
          className="glide-key glide-tap flex h-[3.35rem] items-center justify-center rounded-2xl text-[1.65rem] font-medium tracking-tight"
          style={{ color: "var(--glide-text)" }}
          aria-label={key === "back" ? "Delete" : key}
        >
          {key === "back" ? (
            <Delete className="h-6 w-6 opacity-80" strokeWidth={2} />
          ) : (
            key
          )}
        </button>
      ))}
    </div>
  );
}
