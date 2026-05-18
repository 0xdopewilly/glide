import { SignIn } from "@clerk/nextjs";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { clerkAppearance } from "@/lib/clerk-appearance";
import Link from "next/link";

export default function SignInPage() {
  return (
    <OnboardingShell>
      <div className="flex flex-1 flex-col px-7 pb-10 pt-14">
        <Link
          href="/onboarding"
          className="mb-6 inline-block text-sm font-medium glide-accent-text"
        >
          ← Back
        </Link>
        <SignIn
          appearance={clerkAppearance}
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
        />
      </div>
    </OnboardingShell>
  );
}
