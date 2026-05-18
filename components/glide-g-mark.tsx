import Image from "next/image";

/** Transparent Glide G mark (cyan → purple, wing tip mint). */
export function GlideGMark({
  size = 48,
  glow = true,
  className = "",
  priority = false,
}: {
  size?: number;
  glow?: boolean;
  className?: string;
  priority?: boolean;
}) {
  return (
    <span
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {glow ? (
        <span
          className="pointer-events-none absolute inset-0 scale-125 rounded-full opacity-70 blur-2xl"
          style={{
            background:
              "radial-gradient(circle at 40% 30%, rgba(0,200,255,0.35) 0%, rgba(124,58,237,0.4) 55%, transparent 72%)",
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
        priority={priority}
        sizes={`${size}px`}
      />
    </span>
  );
}
