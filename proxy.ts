import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { IS_MAINNET } from "@/lib/network";

const isPublicRoute = createRouteMatcher([
  "/onboarding",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/privacy",
  "/terms",
  "/support",
  "/api/health/db",
  "/api/health/kit",
  "/api/log",
  "/api/webhooks/(.*)",
  "/api/public/(.*)",
  "/api/cron/(.*)",
  "/partners/(.*)",
]);

/** Testnet-only debugging tools (faucet, stack-trace diagnostics, gas drain).
 * Never served on mainnet. */
const isTestnetOnlyRoute = createRouteMatcher([
  "/api/debug/(.*)",
  "/api/admin/drain-receive-gas",
  "/api/wallet/fund",
]);

/** Dev instance on Vercel - no custom domain in Clerk; allow these origins explicitly. */
const authorizedParties = [
  "http://localhost:3000",
  "https://app.glidepay.cash",
  "https://glide-arc.vercel.app",
  ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
  // Phone testing on local WiFi (dev-only; ignored in production).
  ...(process.env.NODE_ENV === "development"
    ? ["http://192.168.1.178:3000"]
    : []),
];

export default clerkMiddleware(
  async (auth, request) => {
    if (IS_MAINNET && isTestnetOnlyRoute(request)) {
      return new NextResponse(null, { status: 404 });
    }

    const { userId } = await auth();
    const { pathname } = request.nextUrl;

    if (!userId) {
      if (pathname === "/") {
        return NextResponse.redirect(new URL("/onboarding", request.url));
      }
      if (!isPublicRoute(request)) {
        return NextResponse.redirect(new URL("/sign-in", request.url));
      }
    }
  },
  {
    authorizedParties,
    signInUrl: "/sign-in",
    signUpUrl: "/sign-up",
    // Clerk production runs its Frontend API through this app at /__clerk
    // (Clerk "app proxy" — no Clerk DNS records). Enabled only where
    // NEXT_PUBLIC_CLERK_PROXY_URL is set (mainnet); the testnet deployment
    // on Clerk's development instance doesn't proxy. Clerk answers these
    // requests before the handler above runs.
    frontendApiProxy: {
      enabled: Boolean(process.env.NEXT_PUBLIC_CLERK_PROXY_URL?.trim()),
    },
  },
);

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    // Clerk's proxied script paths end in .js, which the first pattern skips.
    "/__clerk/(.*)",
  ],
};
