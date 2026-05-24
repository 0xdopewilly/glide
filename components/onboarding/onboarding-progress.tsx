"use client";

export function OnboardingProgress({
  total,
  current,
}: {
  total: number;
  current: number;
}) {
  return (
    <div
      className="flex flex-1 gap-1.5"
      role="progressbar"
      aria-valuenow={current + 1}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-label={`Step ${current + 1} of ${total}`}
    >
      {Array.from({ length: total }).map((_, i) => {
        const filled = i <= current;
        return (
          <div
            key={i}
            className="h-1 flex-1 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--glide-text)_12%,transparent)]"
          >
            <div
              className="h-full w-full rounded-full bg-[var(--glide-text)]"
              style={{
                transformOrigin: "left",
                transform: `scaleX(${filled ? 1 : 0})`,
                opacity: filled ? 1 : 0.35,
                transition:
                  "transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.35s cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
