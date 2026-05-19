"use client";

import { useAuth } from "@/context/auth-context";
import { useWallet } from "@/context/wallet-context";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const BYPASS = ["/setup-username"];

export function UsernameGate({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const { profile, loading } = useWallet();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!ready || !user || loading) return;
    if (BYPASS.some((p) => pathname.startsWith(p))) return;
    if (!profile.username) {
      router.replace("/setup-username");
    }
  }, [ready, user, loading, profile.username, pathname, router]);

  if (!ready || !user) return <>{children}</>;
  if (BYPASS.some((p) => pathname.startsWith(p))) return <>{children}</>;
  if (loading) return <>{children}</>;
  if (!profile.username) return null;

  return <>{children}</>;
}
