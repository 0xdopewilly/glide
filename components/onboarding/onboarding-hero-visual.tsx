import Image from "next/image";

export function OnboardingHeroVisual({ step }: { step: number }) {
  return (
    <div className="relative flex items-center justify-center py-3">
      <div
        className={`onboarding-hero-glow onboarding-hero-glow--${Math.min(step, 2)} absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2`}
        aria-hidden
      />
      <Image
        src="/glidepay-wordmark.png"
        alt="glidepay"
        width={1205}
        height={397}
        priority
        className="glide-scale-in relative z-10 h-24 w-auto"
      />
    </div>
  );
}
