"use client";

import { useAuth } from "@/context/auth-context";
import { useProfile } from "@/context/wallet-context";
import { hasSkippedTag } from "@/lib/tag-skip";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const BYPASS = ["/setup-username"];

export function UsernameGate({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const { profile, profileHydrated } = useProfile();
  const router = useRouter();
  const pathname = usePathname();

  const onSetupPage = BYPASS.some((p) => pathname.startsWith(p));
  const waiting = !profileHydrated;
  // "Skip for now" on the setup page lets the user in without a tag.
  const skipped = hasSkippedTag(user?.id);

  useEffect(() => {
    if (!ready || !user || waiting) return;
    if (onSetupPage) return;
    if (!profile.username && !skipped) {
      router.replace("/setup-username");
    }
  }, [ready, user, waiting, profile.username, pathname, router, onSetupPage, skipped]);

  if (!ready || !user) return <>{children}</>;
  if (onSetupPage) return <>{children}</>;
  if (waiting) return <>{children}</>;
  if (!profile.username && !skipped) return null;

  return <>{children}</>;
}
