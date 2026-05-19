import { AppShell } from "@/components/app-shell";
import { AuthGate } from "@/components/auth-gate";
import { UsernameGate } from "@/components/username-gate";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <UsernameGate>
        <AppShell>{children}</AppShell>
      </UsernameGate>
    </AuthGate>
  );
}
