export function OnboardingDots({
  total,
  current,
}: {
  total: number;
  current: number;
}) {
  return (
    <div
      className="flex justify-center gap-1.5 pb-5 pt-2"
      role="tablist"
      aria-label="Onboarding steps"
    >
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          role="tab"
          aria-selected={i === current}
          className={`onboarding-dot ${
            i === current ? "onboarding-dot--active" : "onboarding-dot--inactive"
          }`}
        />
      ))}
    </div>
  );
}
