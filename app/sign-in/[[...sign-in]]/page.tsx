import { AuthFlowHeader } from "@/components/auth-flow-header";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { clerkAppearance } from "@/lib/clerk-appearance";
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <OnboardingShell>
      <AuthFlowHeader />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-10">
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
