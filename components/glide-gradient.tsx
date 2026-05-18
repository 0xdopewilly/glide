/** Soft mesh gradient — purple glow on the right, subtle blue accent. */
export function GlideGradient({
  className = "",
  intensity = "default",
}: {
  className?: string;
  intensity?: "default" | "vivid";
}) {
  const vivid = intensity === "vivid" ? "glide-gradient--vivid" : "";

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden glide-gradient ${vivid} ${className}`}
      aria-hidden
    >
      <div className="glide-mesh-layer glide-mesh-layer--primary" />
      <div className="glide-mesh-layer glide-mesh-layer--secondary" />
      <div className="glide-mesh-layer glide-mesh-layer--accent" />
      <div className="glide-mesh-layer glide-mesh-layer--warm" />
      <div className="glide-mesh-vignette" />
    </div>
  );
}
