"use client";

import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { useAuth } from "@/context/auth-context";
import { Instrument_Serif } from "next/font/google";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Display serif for the headline, per the reference design (onboarding only).
const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

const jakarta = "var(--font-jakarta), var(--font-geist-sans), system-ui, sans-serif";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, ready } = useAuth();

  useEffect(() => {
    if (ready && user) router.replace("/");
  }, [ready, user, router]);

  return (
    <OnboardingShell>
      <div
        className="glide-onboarding flex h-full min-h-0 flex-1 flex-col overflow-hidden px-6 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]"
        style={{ fontFamily: jakarta }}
      >
        <p className="text-[20px] font-bold tracking-tight text-white">glidepay</p>

        {/* Hero: floating balance cards */}
        <div className="relative mx-auto mt-4 h-[300px] w-full max-w-[340px] shrink-0">
          <svg
            viewBox="0 0 340 300"
            className="absolute inset-0 h-full w-full"
            fill="none"
            aria-hidden
          >
            <path
              d="M18 120 C 60 40, 110 190, 150 110 S 230 20, 250 70"
              stroke="rgba(255,255,255,0.55)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <BalanceCard
            className="absolute right-0 top-2 w-[196px] rotate-[6deg]"
            currency="Euro"
            code="EURC"
            amount="€1,280.40"
            last4="4410"
          />
          <BalanceCard
            className="absolute left-2 top-[92px] w-[206px] -rotate-[5deg]"
            currency="US Dollar"
            code="USDC"
            amount="$2,420.39"
            last4="9934"
          />
          <span
            className="absolute bottom-6 right-6 rotate-[8deg] rounded-full px-3.5 py-2 text-[13px] font-semibold text-white"
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "1px solid rgba(255,255,255,0.3)",
            }}
          >
            ↙ Request
          </span>
        </div>

        <div className="mt-auto">
          <h1 className={`${serif.className} text-[46px] leading-[1.02] text-white`}>
            <span className="italic">Your Guide To</span>
            <br />
            <span className="font-bold italic">Smarter Money</span>
          </h1>
          <p className="mt-4 max-w-[20rem] text-[15px] leading-relaxed text-white/80">
            Send, save and automate your dollars on Arc. No seed phrases, no
            jargon — just pay by @tag.
          </p>

          <div className="mt-8 space-y-3">
            <button
              type="button"
              onClick={() => router.push("/sign-in")}
              className="glide-tap h-[54px] w-full rounded-full text-[16px] font-semibold text-white"
              style={{ border: "1.5px solid rgba(255,255,255,0.55)" }}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => router.push("/sign-up")}
              className="glide-tap h-[54px] w-full rounded-full text-[16px] font-semibold text-white"
              style={{
                background: "linear-gradient(135deg, #8B6CF6 0%, #6A4AF0 100%)",
                boxShadow: "0 12px 30px -10px rgba(40, 20, 140, 0.6)",
              }}
            >
              Sign Up
            </button>
          </div>
        </div>
      </div>
    </OnboardingShell>
  );
}

function BalanceCard({
  className,
  currency,
  code,
  amount,
  last4,
}: {
  className: string;
  currency: string;
  code: string;
  amount: string;
  last4: string;
}) {
  return (
    <div
      className={`rounded-3xl p-4 text-white ${className}`}
      style={{
        background: "linear-gradient(150deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.12) 100%)",
        border: "1px solid rgba(255,255,255,0.32)",
        boxShadow: "0 20px 40px -18px rgba(30, 15, 110, 0.55)",
      }}
      aria-hidden
    >
      <span className="inline-flex rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold">
        {currency} · {code}
      </span>
      <p className="mt-3 text-[11px] text-white/75">Your balance</p>
      <p className="text-[22px] font-bold tracking-tight">{amount}</p>
      <p className="mt-2 text-[11px] text-white/70">Account •••• {last4}</p>
    </div>
  );
}
