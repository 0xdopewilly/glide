"use client";

import { getClerkAppearance } from "@/lib/clerk-appearance";
import { SignIn, SignUp } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";

// Note: localization (title overrides like "Sign in to glidepay") is set on the
// <ClerkProvider> in app/layout.tsx, not here — this version of @clerk/nextjs
// types don't expose the prop on SignIn/SignUp directly.

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
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        forceRedirectUrl="/setup-username"
      />
    </div>
  );
}
