"use client";

import { ClerkSignInForm } from "@/components/clerk-auth-form";
import { useAuth } from "@/context/auth-context";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const jakarta = "var(--font-jakarta), var(--font-geist-sans), system-ui, sans-serif";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, ready } = useAuth();

  useEffect(() => {
    if (ready && user) router.replace("/");
  }, [ready, user, router]);

  return (
    <div
      className="relative flex min-h-dvh w-full flex-col overflow-hidden"
      style={{
        fontFamily: jakarta,
        background: "linear-gradient(180deg, #0A0F0C 0%, #050505 100%)",
      }}
    >
      {/* Green radial glow at top center */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[60vh]"
        style={{
          background:
            "radial-gradient(circle at 50% 0%, rgba(74,222,128,0.18), transparent 60%)",
        }}
      />

      <div className="relative z-10 flex min-h-dvh w-full flex-1 flex-col items-center px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(3.5rem,env(safe-area-inset-top))]">
        <div className="flex w-full max-w-[400px] flex-1 flex-col items-center">
          {/* Wordmark */}
          <div className="flex flex-col items-center pt-6">
            <Image
              src="/glidepay-wordmark.png"
              alt="glidepay"
              width={1205}
              height={397}
              priority
              className="h-11 w-auto"
            />
            <p className="mt-4 text-center text-[15px] font-medium text-[#A1A1AA]">
              Stablecoins, sent like a text.
            </p>
          </div>

          {/* Form card */}
          <div className="mt-10 w-full rounded-3xl border border-[rgba(74,222,128,0.08)] bg-[#0F0F0F] p-6 sm:p-8">
            <ClerkSignInForm />
          </div>

          {/* Sign-up footer */}
          <p className="mt-8 text-center text-[14px] text-[#A1A1AA]">
            Don&apos;t have an account?{" "}
            <Link
              href="/sign-up"
              className="font-semibold text-[#4ADE80] transition-colors hover:text-[#6EE7A2]"
            >
              Sign up free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
