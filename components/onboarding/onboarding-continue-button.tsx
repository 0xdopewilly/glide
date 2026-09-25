import { ArrowRight } from "lucide-react";

export function OnboardingContinueButton({
  label,
  onClick,
  step = 0,
  className = "",
}: {
  label: string;
  onClick: () => void;
  step?: number;
  className?: string;
}) {
  const stepClass = `onboarding-continue--${Math.min(step, 2)}`;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`onboarding-continue glide-tap ${stepClass} ${className}`}
      style={{ fontFamily: "var(--font-jakarta), var(--font-geist-sans), sans-serif" }}
    >
      <span>{label}</span>
      <ArrowRight className="h-5 w-5" strokeWidth={2.5} aria-hidden />
    </button>
  );
}
