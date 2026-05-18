import { AppShell } from "@/components/app-shell";
import { AuthGate } from "@/components/auth-gate";
import { WalletReadyGate } from "@/components/wallet-ready-gate";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <AppShell>
        <WalletReadyGate>{children}</WalletReadyGate>
      </AppShell>
    </AuthGate>
  );
}
