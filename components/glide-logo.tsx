import { GlideGMark } from "@/components/glide-g-mark";
import Link from "next/link";

type GlideLogoProps = {
  size?: "sm" | "md" | "lg" | "hero";
  linked?: boolean;
  className?: string;
  glow?: boolean;
};

const SIZES = {
  sm: 36,
  md: 44,
  lg: 56,
  hero: 128,
} as const;

export function GlideLogo({
  size = "md",
  linked = false,
  className = "",
  glow = true,
}: GlideLogoProps) {
  const px = SIZES[size];

  const content = (
    <GlideGMark
      size={px}
      glow={glow}
      className={className}
      priority={size === "hero"}
    />
  );

  if (linked) {
    return (
      <Link
        href="/"
        className="inline-flex transition-transform duration-200 active:scale-95"
        aria-label="glidepay home"
      >
        {content}
      </Link>
    );
  }

  return content;
}
