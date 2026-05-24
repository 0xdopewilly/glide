import Image from "next/image";

export function OnboardingHeroVisual({ step }: { step: number }) {
  return (
    <div className="relative flex items-center justify-center py-3">
      <div
        className={`onboarding-hero-glow onboarding-hero-glow--${Math.min(step, 2)} absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2`}
        aria-hidden
      />
      <Image
        src="/glidepay-logo.png"
        alt="glidepay"
        width={180}
        height={180}
        priority
        className="glide-scale-in relative z-10 h-44 w-44 rounded-3xl shadow-2xl"
      />
    </div>
  );
}
