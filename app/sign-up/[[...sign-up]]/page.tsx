import { AuthFlowHeader } from "@/components/auth-flow-header";
import { ClerkSignUpForm } from "@/components/clerk-auth-form";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";

export default function SignUpPage() {
  return (
    <OnboardingShell>
      <AuthFlowHeader />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-10">
        <ClerkSignUpForm />
      </div>
    </OnboardingShell>
  );
}
