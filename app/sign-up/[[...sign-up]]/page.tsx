import { AuthFlowHeader } from "@/components/auth-flow-header";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { clerkAppearance } from "@/lib/clerk-appearance";
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <OnboardingShell>
      <AuthFlowHeader />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-10">
        <SignUp
          appearance={clerkAppearance}
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          forceRedirectUrl="/setup-username"
        />
      </div>
    </OnboardingShell>
  );
}
