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
        background: "var(--glide-bg)",
      }}
    >
      {/* Brand radial glow at top center */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[60vh]"
        style={{
          background:
            "radial-gradient(circle at 50% 0%, rgba(91,61,245,0.18), transparent 60%)",
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
            <p
              className="mt-4 text-center text-[15px] font-medium"
              style={{ color: "var(--glide-muted)" }}
            >
              Stablecoins, sent like a text.
            </p>
          </div>

          {/* Form card */}
          <div
            className="mt-10 w-full rounded-3xl border p-6 sm:p-8"
            style={{
              background: "var(--glide-surface-elevated)",
              borderColor: "var(--glide-elevated-border)",
            }}
          >
            <ClerkSignInForm />
          </div>

          {/* Sign-up footer */}
          <p
            className="mt-8 text-center text-[14px]"
            style={{ color: "var(--glide-muted)" }}
          >
            Don&apos;t have an account?{" "}
            <Link
              href="/sign-up"
              className="font-semibold transition-colors"
              style={{ color: "var(--glide-primary)" }}
            >
              Sign up free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
