export function OnboardingHeroVisual({ step }: { step: number }) {
  return (
    <div className="relative flex items-center justify-center py-3">
      <div
        className={`onboarding-hero-glow onboarding-hero-glow--${Math.min(step, 2)} absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2`}
        aria-hidden
      />
      <span
        className="glide-scale-in relative z-10 text-[4.5rem] font-black tracking-[-0.06em] leading-none"
        style={{ color: "var(--glide-text)" }}
      >
        glidepay<span style={{ color: "var(--glide-accent)" }}>.</span>
      </span>
    </div>
  );
}
