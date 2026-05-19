"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { setTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={() => {
        const isDark = document.documentElement.classList.contains("dark");
        setTheme(isDark ? "light" : "dark");
      }}
      className="glide-tap inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 dark:bg-[#1c1c1e] dark:text-white/80"
      aria-label="Toggle light or dark mode"
      suppressHydrationWarning
    >
      <Sun className="h-[18px] w-[18px] dark:hidden" strokeWidth={2} aria-hidden />
      <Moon
        className="hidden h-[18px] w-[18px] dark:block"
        strokeWidth={2}
        aria-hidden
      />
    </button>
  );
}
