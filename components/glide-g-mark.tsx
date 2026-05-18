import Image from "next/image";

/** Transparent Glide G mark (cyan → purple, wing tip mint). */
export function GlideGMark({
  size = 48,
  glow = true,
  className = "",
  priority = false,
  /** Shifts mark left so the G reads centered when speed lines sit on the left. */
  balanceGlyph = false,
}: {
  size?: number;
  glow?: boolean;
  className?: string;
  priority?: boolean;
  balanceGlyph?: boolean;
}) {
  const opticalShift = balanceGlyph ? Math.round(size * 0.09) : 0;
  const glowCenter = balanceGlyph ? "58% 50%" : "40% 30%";

  return (
    <span
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {glow ? (
        <span
          className="pointer-events-none absolute inset-0 scale-125 rounded-full opacity-70 blur-2xl"
          style={{
            background: `radial-gradient(circle at ${glowCenter}, rgba(0,200,255,0.35) 0%, rgba(124,58,237,0.4) 55%, transparent 72%)`,
          }}
          aria-hidden
        />
      ) : null}
      <Image
        src="/logo-mark.png"
        alt=""
        width={size}
        height={size}
        className="relative z-10 h-auto w-full object-contain"
        style={
          opticalShift > 0
            ? { transform: `translateX(-${opticalShift}px)` }
            : undefined
        }
        priority={priority}
        sizes={`${size}px`}
      />
    </span>
  );
}
