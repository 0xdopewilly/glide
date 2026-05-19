"use client";

import { headerIconButtonClassName } from "@/components/header-icon-button";
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
      className={headerIconButtonClassName()}
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
