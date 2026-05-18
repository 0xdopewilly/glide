"use client";

import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace("/onboarding");
    }
  }, [ready, user, router]);

  if (!ready) {
    return (
      <div
        className="flex min-h-dvh items-center justify-center"
        style={{ background: "var(--glide-bg)" }}
      >
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
          style={{ borderColor: "var(--glide-accent)" }}
          aria-label="Loading"
        />
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
