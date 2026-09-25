import { ChevronLeft } from "lucide-react";

export function OnboardingBackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="glide-tonal-card glide-tap flex shrink-0 items-center justify-center gap-1 rounded-full border-0 px-5 py-[1.05rem] text-[15px] font-semibold tracking-tight text-[var(--glide-text)]"
      style={{ fontFamily: "var(--font-jakarta), var(--font-geist-sans), sans-serif" }}
    >
      <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
      Back
    </button>
  );
}
