/** Soft mesh gradient — purple glow on the right, subtle blue accent. */
export function GlideGradient({ className = "" }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden
    >
      <div className="glide-mesh-layer glide-mesh-layer--primary" />
      <div className="glide-mesh-layer glide-mesh-layer--secondary" />
      <div className="glide-mesh-layer glide-mesh-layer--accent" />
      <div className="glide-mesh-vignette" />
    </div>
  );
}
