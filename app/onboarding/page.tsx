"use client";

import { OnboardingBackButton } from "@/components/onboarding/onboarding-back-button";
import { OnboardingContinueButton } from "@/components/onboarding/onboarding-continue-button";
import { OnboardingDots } from "@/components/onboarding/onboarding-dots";
import { OnboardingHeroVisual } from "@/components/onboarding/onboarding-hero-visual";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/context/auth-context";
import { AnimatePresence, motion } from "framer-motion";
import { useLiteMotion } from "@/hooks/use-lite-motion";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

const ease = [0.22, 1, 0.36, 1] as const;

const SLIDES = [
  {
    tag: "Freedom Unlocked",
    title: "Your gateway to borderless money.",
    body: "Take full control of your USDC on Arc with a wallet built for seamless global payments.",
  },
  {
    tag: "Built for Trust",
    title: "Security that feels invisible.",
    body: "No seed phrases. Email or Google sign-in, and Glide handles the wallet for you.",
  },
  {
    tag: "Limitless Potential",
    title: "More than just a wallet app.",
    body: "Send, receive, and move money like a text. All from one clean app.",
  },
] as const;

const stagger = {
  animate: { transition: { staggerChildren: 0.09, delayChildren: 0.06 } },
};

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.42, ease } },
};

const jakarta = "var(--font-jakarta), var(--font-geist-sans), system-ui, sans-serif";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, ready } = useAuth();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const liteMotion = useLiteMotion();

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
    setDirection(1);
    setStep((s) => Math.min(s + 1, SLIDES.length - 1));
  }, [isLast, router]);

  const goBack = useCallback(() => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  const slideVariants = useMemo(
    () =>
      liteMotion
        ? {
            initial: { opacity: 0 },
            animate: { opacity: 1, transition: { duration: 0.28, ease } },
            exit: { opacity: 0, transition: { duration: 0.2, ease } },
          }
        : {
            initial: (d: number) => ({
              opacity: 0,
              x: d > 0 ? 48 : -48,
            }),
            animate: {
              opacity: 1,
              x: 0,
              transition: { duration: 0.4, ease },
            },
            exit: (d: number) => ({
              opacity: 0,
              x: d > 0 ? -48 : 48,
              transition: { duration: 0.32, ease },
            }),
          },
    [liteMotion],
  );

  return (
    <OnboardingShell>
      <div
        className="grid h-full min-h-0 flex-1 grid-rows-[auto_1fr_auto] overflow-hidden"
        style={{ fontFamily: jakarta }}
      >
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease }}
          className="flex items-center justify-between px-6 pb-2 pt-[max(1.25rem,env(safe-area-inset-top))]"
        >
          <ThemeToggle />
          <button
            type="button"
            onClick={() => router.push("/sign-in")}
            className="glide-tap text-[15px] font-medium text-[var(--glide-muted)] transition-colors hover:text-[var(--glide-text)]"
          >
            Login
          </button>
        </motion.header>

        <div className="flex min-h-0 flex-col justify-center">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={`hero-${step}`}
              custom={direction}
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="w-full"
            >
              <OnboardingHeroVisual step={step} />
            </motion.div>
          </AnimatePresence>

          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="px-6 pt-2"
            >
              <motion.div variants={stagger} initial="initial" animate="animate">
                <motion.span
                  variants={fadeUp}
                  className="inline-flex rounded-full bg-[var(--glide-primary-container)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--glide-accent)]"
                >
                  {slide.tag}
                </motion.span>

                <motion.h1
                  variants={fadeUp}
                  className="mt-4 text-[1.7rem] font-bold leading-[1.18] tracking-[-0.025em] text-[var(--glide-text)]"
                >
                  {slide.title}
                </motion.h1>

                <motion.p
                  variants={fadeUp}
                  className="mt-3.5 max-w-[19.5rem] text-[15px] leading-[1.6] text-[var(--glide-muted)]"
                >
                  {slide.body}
                </motion.p>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>

        <motion.footer
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.45, ease }}
          className="px-6 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-4"
        >
          <motion.div layout className="space-y-3" transition={{ duration: 0.32, ease }}>
            <div className={`flex gap-3 ${step === 0 ? "flex-col" : "flex-row items-stretch"}`}>
              <AnimatePresence mode="popLayout">
                {step > 0 ? (
                  <OnboardingBackButton key="back" onClick={goBack} />
                ) : null}
              </AnimatePresence>
              <motion.div
                layout
                className={step === 0 ? "w-full" : "min-w-0 flex-1"}
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              >
                <OnboardingContinueButton
                  label={isLast ? "Create account" : "Continue"}
                  step={step}
                  onClick={goNext}
                />
              </motion.div>
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
          </motion.div>
          <OnboardingDots total={SLIDES.length} current={step} />
        </motion.footer>
      </div>
    </OnboardingShell>
  );
}
