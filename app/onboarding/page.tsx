"use client";

import { CardHeroArt, PaperHeroArt } from "@/components/illustrations";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { useAuth } from "@/context/auth-context";
import { Instrument_Serif } from "next/font/google";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

// Display serif for the headlines, per the reference design (onboarding only).
const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

const jakarta = "var(--font-jakarta), var(--font-geist-sans), system-ui, sans-serif";

const SLIDES: { art: ReactNode; lead: string; title: string; body: string }[] = [
  {
    art: <BalanceCardsHero />,
    lead: "Your Guide To",
    title: "Smarter Money",
    body: "Send, save and automate your dollars on Arc. No seed phrases, no jargon.",
  },
  {
    art: <CardHeroArt className="h-[250px] w-auto" />,
    lead: "Pay anyone",
    title: "by @tag",
    body: "Dollars arrive in seconds — to a pay tag, a contact, or any wallet on Arc.",
  },
  {
    art: <PaperHeroArt className="h-[250px] w-auto" />,
    lead: "Money that",
    title: "runs itself",
    body: "Set a rule once — save 10% of every payment, pay rent on the 1st — and glidepay does the rest.",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, ready } = useAuth();
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (ready && user) router.replace("/");
  }, [ready, user, router]);

  // Native swipe (CSS scroll-snap); the dots follow the scroll position.
  const onScroll = () => {
    const el = trackRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / Math.max(el.clientWidth, 1));
    if (i !== active) setActive(i);
  };
  const goTo = (i: number) => {
    const el = trackRef.current;
    el?.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  return (
    <OnboardingShell>
      <div
        className="flex h-full min-h-0 flex-1 flex-col overflow-hidden pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]"
        style={{ fontFamily: jakarta }}
      >
        <p className="px-6 text-[20px] font-bold tracking-tight text-white">glidepay</p>

        <div
          ref={trackRef}
          onScroll={onScroll}
          className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-roledescription="carousel"
        >
          {SLIDES.map((s, i) => (
            <section
              key={s.title}
              className="flex h-full w-full shrink-0 snap-center flex-col px-6"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${SLIDES.length}`}
            >
              <div className="flex min-h-0 flex-1 items-center justify-center">{s.art}</div>
              <h1 className={`${serif.className} text-[44px] leading-[1.02] text-white`}>
                <span className="italic">{s.lead}</span>
                <br />
                <span className="font-bold italic">{s.title}</span>
              </h1>
              <p className="mt-3 max-w-[20rem] text-[15px] leading-relaxed text-white/80">
                {s.body}
              </p>
            </section>
          ))}
        </div>

        <div className="px-6">
          <div className="mt-7 space-y-3">
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
          <div className="mt-5 flex justify-center gap-2" role="tablist" aria-label="Slides">
            {SLIDES.map((s, i) => (
              <button
                key={s.title}
                type="button"
                role="tab"
                aria-selected={i === active}
                aria-label={`Slide ${i + 1}`}
                onClick={() => goTo(i)}
                className="flex h-6 w-6 items-center justify-center"
              >
                <span
                  className="block rounded-full"
                  style={{
                    width: 7,
                    height: 7,
                    background: i === active ? "#FFFFFF" : "rgba(255,255,255,0.35)",
                  }}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </OnboardingShell>
  );
}

/** Slide 1: floating glass balance cards with a hand-drawn swoosh. */
function BalanceCardsHero() {
  return (
    <div className="relative h-[290px] w-full max-w-[340px]">
      <svg viewBox="0 0 340 290" className="absolute inset-0 h-full w-full" fill="none" aria-hidden>
        <path
          d="M18 118 C 60 38, 110 188, 150 108 S 230 18, 250 68"
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
        className="absolute left-2 top-[88px] w-[206px] -rotate-[5deg]"
        currency="US Dollar"
        code="USDC"
        amount="$2,420.39"
        last4="9934"
      />
      <span
        className="absolute bottom-4 right-6 rotate-[8deg] rounded-full px-3.5 py-2 text-[13px] font-semibold text-white"
        style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)" }}
      >
        ↙ Request
      </span>
    </div>
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
