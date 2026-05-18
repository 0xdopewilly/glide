"use client";

import { ArrowRight } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

/** Primary = white notched CTA (reference). Ghost = text link. */
type Variant = "primary" | "ghost";

export function GlideButton({
  variant = "primary",
  size = "md",
  children,
  className = "",
  showArrow = false,
  uppercase = true,
  fullWidth = true,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: "sm" | "md";
  showArrow?: boolean;
  uppercase?: boolean;
  fullWidth?: boolean;
}) {
  const widthClass = fullWidth ? "w-full" : "";
  const sizeClass = size === "sm" ? "glide-btn-notch--sm" : "";

  if (variant === "ghost") {
    return (
      <button
        type="button"
        className={`glide-btn-ghost ${size === "sm" ? "glide-btn-ghost--sm" : ""} ${widthClass} ${fullWidth ? "" : "glide-btn-ghost--inline"} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`glide-btn-notch group ${sizeClass} ${widthClass} ${className}`}
      {...props}
    >
      <span className="glide-btn-notch__accent" aria-hidden />
      <span
        className={`glide-btn-notch__inner ${uppercase ? "glide-btn-notch__inner--caps" : ""}`}
      >
        {children}
        {showArrow ? (
          <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
        ) : null}
      </span>
    </button>
  );
}

export function glideButtonClass(variant: Variant = "primary") {
  if (variant === "ghost") return "glide-btn-ghost w-full";
  return "glide-btn-notch w-full";
}
