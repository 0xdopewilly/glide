"use client";

import type { AuthUser } from "@/lib/auth-types";
import {
  cacheGet,
  cacheSet,
  clearUserCaches,
  LAST_USER_KEY,
} from "@/lib/client-cache";
import { useAuth as useClerkAuth, useUser } from "@clerk/nextjs";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";

type AuthContextValue = {
  /** Verified by Clerk (null until Clerk has loaded). */
  user: AuthUser | null;
  ready: boolean;
  /** For the signed-in app shell: Clerk's user once loaded, and before that
   * the last user who signed in on this device, so cached data renders and
   * fetches start without waiting on Clerk's script. The session cookie
   * still authorizes every API call. */
  appUser: AuthUser | null;
  appReady: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

let snapshotRaw: string | null | undefined;
let snapshotUser: AuthUser | null = null;

/** Stable snapshot of the last signed-in user (parsed once per raw value). */
function lastUserSnapshot(): AuthUser | null {
  const raw = cacheGet(LAST_USER_KEY);
  if (raw !== snapshotRaw) {
    snapshotRaw = raw;
    try {
      snapshotUser = raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      snapshotUser = null;
    }
  }
  return snapshotUser;
}

const noSubscribe = () => () => {};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, user: clerkUser } = useUser();
  const { signOut: clerkSignOut } = useClerkAuth();
  // Server snapshot is null, so hydration matches the server's HTML; the
  // stored user applies on the client right after.
  const lastUser = useSyncExternalStore(noSubscribe, lastUserSnapshot, () => null);

  const user = useMemo<AuthUser | null>(
    () =>
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
        : null,
    [isSignedIn, clerkUser],
  );

  // Once Clerk knows: remember the user for the next cold start, or — if
  // there's no session (signed out here or elsewhere) — wipe every cache.
  useEffect(() => {
    if (!isLoaded) return;
    if (user) cacheSet(LAST_USER_KEY, JSON.stringify(user));
    else clearUserCaches();
  }, [isLoaded, user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      ready: isLoaded,
      appUser: isLoaded ? user : lastUser,
      appReady: isLoaded || lastUser !== null,
      signOut: async () => {
        clearUserCaches();
        await clerkSignOut({ redirectUrl: "/onboarding" });
      },
    }),
    [isLoaded, user, lastUser, clerkSignOut],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

/** Clerk-verified auth. Use outside the app shell (onboarding, setup). */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/** Optimistic auth for the signed-in app shell (see appUser). */
export function useAppAuth() {
  const ctx = useAuth();
  return { user: ctx.appUser, ready: ctx.appReady, signOut: ctx.signOut };
}
