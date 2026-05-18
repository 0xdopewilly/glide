"use client";

import type { AuthUser } from "@/lib/auth-types";
import { useAuth as useClerkAuth, useUser } from "@clerk/nextjs";
import { createContext, useContext, useMemo } from "react";

type AuthContextValue = {
  user: AuthUser | null;
  ready: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, user: clerkUser } = useUser();
  const { signOut: clerkSignOut } = useClerkAuth();

  const value = useMemo<AuthContextValue>(() => {
    const user: AuthUser | null =
      isSignedIn && clerkUser
        ? {
            id: clerkUser.id,
            email:
              clerkUser.primaryEmailAddress?.emailAddress ??
              clerkUser.emailAddresses[0]?.emailAddress ??
              "",
            displayName:
              clerkUser.fullName?.trim() ||
              clerkUser.firstName?.trim() ||
              "Guest",
            provider: "clerk",
            createdAt: clerkUser.createdAt?.toISOString() ?? "",
          }
        : null;

    return {
      user,
      ready: isLoaded,
      signOut: async () => {
        await clerkSignOut({ redirectUrl: "/onboarding" });
      },
    };
  }, [isLoaded, isSignedIn, clerkUser, clerkSignOut]);

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
