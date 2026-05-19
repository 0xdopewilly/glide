import { AppShell } from "@/components/app-shell";
import { AuthGate } from "@/components/auth-gate";
import { UsernameGate } from "@/components/username-gate";
import { PrivacyProvider } from "@/context/privacy-context";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <UsernameGate>
        <PrivacyProvider>
          <AppShell>{children}</AppShell>
        </PrivacyProvider>
      </UsernameGate>
    </AuthGate>
  );
}
