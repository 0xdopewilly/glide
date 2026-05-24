"use client";

import { OnboardingBackButton } from "@/components/onboarding/onboarding-back-button";
import { OnboardingContinueButton } from "@/components/onboarding/onboarding-continue-button";
import { OnboardingDots } from "@/components/onboarding/onboarding-dots";
import { OnboardingHeroVisual } from "@/components/onboarding/onboarding-hero-visual";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const SLIDES = [
  {
    tag: "Freedom Unlocked",
    title: "Your gateway to borderless money.",
    body: "Take full control of your USDC on Arc with a wallet built for seamless global payments.",
  },
  {
    tag: "Built for Trust",
    title: "Security that feels invisible.",
    body: "No seed phrases. Email or Google sign-in, and glidepay handles the wallet for you.",
  },
  {
    tag: "Limitless Potential",
    title: "More than just a wallet app.",
    body: "Send, receive, and move money like a text. All from one clean app.",
  },
] as const;

const jakarta = "var(--font-jakarta), var(--font-geist-sans), system-ui, sans-serif";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, ready } = useAuth();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");

  const isLast = step === SLIDES.length - 1;
  const slide = SLIDES[step];

  useEffect(() => {
    if (ready && user) router.replace("/");
  }, [ready, user, router]);

  const goNext = useCallback(() => {
    if (isLast) {
      router.push("/sign-up");
      return;
    }
    setDirection("forward");
    setStep((s) => Math.min(s + 1, SLIDES.length - 1));
  }, [isLast, router]);

  const goBack = useCallback(() => {
    setDirection("back");
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  return (
    <OnboardingShell>
      <div
        className="grid h-full min-h-0 flex-1 grid-rows-[auto_1fr_auto] overflow-hidden"
        style={{ fontFamily: jakarta }}
      >
        <header className="flex items-center justify-between px-6 pb-2 pt-[max(1.25rem,env(safe-area-inset-top))]">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => router.push("/sign-in")}
            className="glide-tap text-[15px] font-medium text-[var(--glide-muted)] transition-colors hover:text-[var(--glide-text)]"
          >
            Login
          </button>
        </header>

        <div
          key={step}
          className={`flex min-h-0 flex-col justify-center ${
            direction === "forward" ? "slide-from-right" : "slide-from-left"
          }`}
        >
          <OnboardingHeroVisual step={step} />
          <div className="px-6 pt-2">
            <span className="inline-flex rounded-full bg-[var(--glide-primary-container)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--glide-accent)]">
              {slide.tag}
            </span>
            <h1 className="mt-4 text-[1.7rem] font-bold leading-[1.18] tracking-[-0.025em] text-[var(--glide-text)]">
              {slide.title}
            </h1>
            <p className="mt-3.5 max-w-[19.5rem] text-[15px] leading-[1.6] text-[var(--glide-muted)]">
              {slide.body}
            </p>
          </div>
        </div>

        <footer className="px-6 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-4">
          <div className="space-y-3">
            <div
              className={`flex gap-3 transition-[gap] duration-150 ${
                step === 0 ? "flex-col" : "flex-row items-stretch"
              }`}
            >
              {step > 0 ? <OnboardingBackButton onClick={goBack} /> : null}
              <div className={step === 0 ? "w-full" : "min-w-0 flex-1"}>
                <OnboardingContinueButton
                  label={isLast ? "Create account" : "Continue"}
                  step={step}
                  onClick={goNext}
                />
              </div>
            </div>

            {step === 0 ? (
              <button
                type="button"
                onClick={() => router.push("/sign-in")}
                className="glide-tap w-full py-2.5 text-center text-sm font-semibold text-[var(--glide-muted)] transition-colors hover:text-[var(--glide-accent)]"
              >
                I already have an account
              </button>
            ) : null}
          </div>
          <OnboardingDots total={SLIDES.length} current={step} />
        </footer>
      </div>
    </OnboardingShell>
  );
}
