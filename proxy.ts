import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
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

/** The canonical app host on mainnet. Clerk production only signs people in on
 * glidepay.cash domains, so the old vercel.app link sends pages here. API
 * routes are left alone: webhooks and cron may still call them directly. */
const CANONICAL_HOST = "app.glidepay.cash";
const LEGACY_HOSTS = new Set(["glide-arc.vercel.app"]);

const clerk = clerkMiddleware(
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

/** Legacy-host redirect first, before Clerk sees the request (a production
 * Clerk key rejects hosts outside glidepay.cash). */
export default function proxy(request: NextRequest, event: NextFetchEvent) {
  const host = request.headers.get("host") ?? "";
  if (
    IS_MAINNET &&
    LEGACY_HOSTS.has(host) &&
    !request.nextUrl.pathname.startsWith("/api/")
  ) {
    const { pathname, search } = request.nextUrl;
    return NextResponse.redirect(`https://${CANONICAL_HOST}${pathname}${search}`, 308);
  }
  return clerk(request, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    // Clerk's proxied script paths end in .js, which the first pattern skips.
    "/__clerk/(.*)",
  ],
};
