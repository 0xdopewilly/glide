import { GlideGMark } from "@/components/glide-g-mark";

const MARK_SIZE = 140;

export function OnboardingHeroVisual({ step }: { step: number }) {
  return (
    <div className="relative flex items-center justify-center py-3">
      <div
        className={`onboarding-hero-glow onboarding-hero-glow--${Math.min(step, 2)} absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2`}
        aria-hidden
      />
      <GlideGMark size={MARK_SIZE} glow={false} balanceGlyph priority />
    </div>
  );
}
