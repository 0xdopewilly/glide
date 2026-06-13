import { ClerkSignUpForm } from "@/components/clerk-auth-form";
import { headerIconButtonClassName } from "@/components/header-icon-button";
import { ChevronLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const jakarta = "var(--font-jakarta), var(--font-geist-sans), system-ui, sans-serif";

export default function SignUpPage() {
  return (
    <div
      className="relative flex min-h-dvh w-full flex-col overflow-hidden"
      style={{
        fontFamily: jakarta,
        background: "linear-gradient(180deg, #0A0F0C 0%, #050505 100%)",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[60vh]"
        style={{
          background:
            "radial-gradient(circle at 50% 0%, rgba(74,222,128,0.18), transparent 60%)",
        }}
      />

      <header className="relative z-10 flex shrink-0 items-center px-5 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Link
          href="/onboarding"
          className={headerIconButtonClassName()}
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2.25} />
        </Link>
      </header>

      <div className="relative z-10 flex flex-1 flex-col items-center px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-4">
        <div className="flex w-full max-w-[400px] flex-1 flex-col items-center">
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
              Create your glidepay account.
            </p>
          </div>

          <div className="mt-10 w-full rounded-3xl border border-[rgba(74,222,128,0.08)] bg-[#0F0F0F] p-6 sm:p-8">
            <ClerkSignUpForm />
          </div>

          <p className="mt-8 text-center text-[14px] text-[#A1A1AA]">
            Already have an account?{" "}
            <Link
              href="/sign-in"
              className="font-semibold text-[#4ADE80] transition-colors hover:text-[#6EE7A2]"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
