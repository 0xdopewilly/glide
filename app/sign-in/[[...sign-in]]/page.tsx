import { AuthFlowHeader } from "@/components/auth-flow-header";
import { ClerkSignInForm } from "@/components/clerk-auth-form";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";

export default function SignInPage() {
  return (
    <OnboardingShell>
      <AuthFlowHeader />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-10">
        <ClerkSignInForm />
      </div>
    </OnboardingShell>
  );
}
