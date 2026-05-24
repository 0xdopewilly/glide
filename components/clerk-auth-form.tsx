"use client";

import { getClerkAppearance } from "@/lib/clerk-appearance";
import { SignIn, SignUp } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";

/** Override Clerk's default "Sign in to <AppName>" / "Sign up for <AppName>"
 *  copy. Clerk reads the app name from your Dashboard; this forces it to say
 *  "glidepay" in case the Dashboard hasn't been updated. */
const glidepayLocalization = {
  signIn: {
    start: {
      title: "Sign in to glidepay",
      subtitle: "Welcome back. Please sign in to continue.",
    },
  },
  signUp: {
    start: {
      title: "Create your glidepay account",
      subtitle: "Send and receive money in seconds.",
    },
  },
};

function useResolvedAppTheme(): "light" | "dark" {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return "light";
  return resolvedTheme === "dark" ? "dark" : "light";
}

export function ClerkSignInForm() {
  const theme = useResolvedAppTheme();
  const appearance = useMemo(() => getClerkAppearance(theme), [theme]);

  return (
    <div className="clerk-auth" data-theme={theme}>
      <SignIn
        appearance={appearance}
        localization={glidepayLocalization}
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
      />
    </div>
  );
}

export function ClerkSignUpForm() {
  const theme = useResolvedAppTheme();
  const appearance = useMemo(() => getClerkAppearance(theme), [theme]);

  return (
    <div className="clerk-auth" data-theme={theme}>
      <SignUp
        appearance={appearance}
        localization={glidepayLocalization}
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        forceRedirectUrl="/setup-username"
      />
    </div>
  );
}
