/** Static accent wash — no blur layers, no animation (GPU-friendly). */
export function GlideGradient({
  className = "",
}: {
  className?: string;
  intensity?: "default" | "vivid";
}) {
  return (
    <div
      className={`glide-bg-wash pointer-events-none absolute inset-0 ${className}`}
      aria-hidden
    />
  );
}
