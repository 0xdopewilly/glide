"use client";

import type { ReactNode } from "react";

/** Primary CTA - matches onboarding Continue button. */
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
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`glide-tap glide-label-mono inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-[12px] font-bold disabled:opacity-45 ${className}`}
      style={{
        background: "var(--glide-accent)",
        color: "var(--glide-bg)",
      }}
    >
      {children}
      {icon}
    </button>
  );
}
