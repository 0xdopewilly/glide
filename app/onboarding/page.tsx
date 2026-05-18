"use client";

import { GlideButton } from "@/components/glide-button";
import { GlideLogo } from "@/components/glide-logo";
import { OnboardingFeatures } from "@/components/onboarding/onboarding-features";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { useAuth } from "@/context/auth-context";
import { AnimatePresence, motion } from "framer-motion";
import { Mail, MessageCircle, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const slide = {
  initial: { opacity: 0, x: 28 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -28 },
  transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.07, delayChildren: 0.12 } },
};

const fadeUp = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
};

const FEATURES = [
  { icon: Mail, text: "Email or Google, no seed phrases" },
  { icon: Zap, text: "Instant smart account on Arc" },
  { icon: MessageCircle, text: "Send money like a text" },
] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const { user, ready } = useAuth();

  useEffect(() => {
    if (ready && user) router.replace("/");
  }, [ready, user, router]);

  return (
    <OnboardingShell>
      <AnimatePresence mode="wait">
        <motion.div
          key="welcome"
          {...slide}
          className="flex flex-1 flex-col px-7 pb-10 pt-14"
        >
          <motion.div variants={stagger} initial="initial" animate="animate">
            <motion.div variants={fadeUp}>
              <GlideLogo size="lg" />
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="mt-10 text-[2.15rem] font-semibold leading-[1.15] tracking-tight"
            >
              Money that moves
              <br />
              <span className="glide-accent-text">like a message</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mt-4 max-w-[20rem] text-[16px] leading-relaxed glide-muted"
            >
                USDC on Arc without browser wallets or crypto jargon. Sign in
                once and we handle the rest.
            </motion.p>

            <OnboardingFeatures items={FEATURES} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.4 }}
            className="mt-auto flex items-center gap-3 pt-6"
          >
            <GlideButton
              size="sm"
              fullWidth={false}
              uppercase={false}
              className="shrink-0"
              onClick={() => router.push("/sign-up")}
            >
              Create account
            </GlideButton>
            <GlideButton
              variant="ghost"
              size="sm"
              fullWidth={false}
              className="min-w-0 flex-1 text-left leading-snug"
              onClick={() => router.push("/sign-in")}
            >
              I already have an account
            </GlideButton>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </OnboardingShell>
  );
}
