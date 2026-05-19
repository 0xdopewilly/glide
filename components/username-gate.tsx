"use client";

import { useAuth } from "@/context/auth-context";
import { useWallet } from "@/context/wallet-context";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const BYPASS = ["/setup-username"];

export function UsernameGate({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const { profile, profileHydrated } = useWallet();
  const router = useRouter();
  const pathname = usePathname();

  const onSetupPage = BYPASS.some((p) => pathname.startsWith(p));
  const waiting = !profileHydrated;

  useEffect(() => {
    if (!ready || !user || waiting) return;
    if (onSetupPage) return;
    if (!profile.username) {
      router.replace("/setup-username");
    }
  }, [ready, user, waiting, profile.username, pathname, router, onSetupPage]);

  if (!ready || !user) return <>{children}</>;
  if (onSetupPage) return <>{children}</>;
  if (waiting) return <>{children}</>;
  if (!profile.username) return null;

  return <>{children}</>;
}
