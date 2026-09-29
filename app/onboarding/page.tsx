"use client";

import { OnboardingBackButton } from "@/components/onboarding/onboarding-back-button";
import { OnboardingContinueButton } from "@/components/onboarding/onboarding-continue-button";
import { OnboardingDots } from "@/components/onboarding/onboarding-dots";
import { OnboardingHeroVisual } from "@/components/onboarding/onboarding-hero-visual";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

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

/** The outgoing slide's exit (onb-slide-out-* in globals.css) before the next
 * one enters. */
const EXIT_MS = 200;

export default function OnboardingPage() {
  const router = useRouter();
  const { user, ready } = useAuth();
  // `step` drives the buttons and dots (they update on tap); `shown` is the
  // slide on screen, which changes once the outgoing one has left.
  const [step, setStep] = useState(0);
  const [shown, setShown] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const stepRef = useRef(0);
  const exitTimer = useRef<number | undefined>(undefined);

  const isLast = step === SLIDES.length - 1;
  const slide = SLIDES[shown];

  useEffect(() => () => window.clearTimeout(exitTimer.current), []);

  const goTo = useCallback((next: number, dir: "forward" | "back") => {
    stepRef.current = next;
    setDirection(dir);
    setStep(next);
    setLeaving(true);
    window.clearTimeout(exitTimer.current);
    exitTimer.current = window.setTimeout(() => {
      setShown(stepRef.current);
      setLeaving(false);
    }, EXIT_MS);
  }, []);

  useEffect(() => {
    if (ready && user) router.replace("/");
  }, [ready, user, router]);

  // Warm Log in / Sign up once the phone is idle — well after the entrance
  // animations — so the download/parse never competes with them.
  useEffect(() => {
    let idle: number | undefined;
    const timer = window.setTimeout(() => {
      const warm = () => {
        router.prefetch("/sign-in");
        router.prefetch("/sign-up");
      };
      if ("requestIdleCallback" in window) {
        idle = window.requestIdleCallback(warm, { timeout: 4000 });
      } else warm();
    }, 2500);
    return () => {
      window.clearTimeout(timer);
      if (idle !== undefined) window.cancelIdleCallback(idle);
    };
  }, [router]);

  const goNext = useCallback(() => {
    if (isLast) {
      router.push("/sign-up");
      return;
    }
    goTo(Math.min(stepRef.current + 1, SLIDES.length - 1), "forward");
  }, [isLast, router, goTo]);

  const goBack = useCallback(() => {
    goTo(Math.max(stepRef.current - 1, 0), "back");
  }, [goTo]);

  return (
    <OnboardingShell>
      <div
        className="grid h-full min-h-0 flex-1 grid-rows-[auto_1fr_auto] overflow-hidden"
        style={{ fontFamily: jakarta }}
      >
        <header className="onb-header flex items-center justify-between px-6 pb-2 pt-[max(1.25rem,env(safe-area-inset-top))]">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => router.push("/sign-in")}
            className="glide-tap text-[15px] font-medium text-[var(--glide-muted)] transition-colors hover:text-[var(--glide-text)]"
          >
            Login
          </button>
        </header>

        <div className="relative flex min-h-0 flex-col justify-center">
          <div
            key={shown}
            className={`flex flex-col ${
              leaving ? `onb-slide-out-${direction}` : `onb-slide-in-${direction}`
            }`}
          >
            <div className="onb-hero">
              <OnboardingHeroVisual step={shown} />
            </div>
            <div className="onb-rise px-6 pt-2" style={{ animationDelay: "120ms" }}>
              <span className="inline-flex rounded-full bg-[var(--glide-primary-container)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--glide-accent)]">
                {slide.tag}
              </span>
            </div>
            <h1
              className="onb-rise mt-4 px-6 text-[1.7rem] font-bold leading-[1.18] tracking-[-0.025em] text-[var(--glide-text)]"
              style={{ animationDelay: "180ms" }}
            >
              {slide.title}
            </h1>
            <p
              className="onb-rise mt-3.5 max-w-[19.5rem] px-6 text-[15px] leading-[1.6] text-[var(--glide-muted)]"
              style={{ animationDelay: "240ms" }}
            >
              {slide.body}
            </p>
          </div>
        </div>

        <footer className="onb-footer px-6 pb-[max(1.75rem,var(--glide-safe-bottom))] pt-4">
          <div className="space-y-3">
            <div
              className={`flex gap-3 ${
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
