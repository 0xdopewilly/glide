import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/onboarding",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/privacy",
  "/terms",
  "/support",
  "/api/health/db",
  "/api/health/kit",
  "/api/webhooks/(.*)",
  "/api/public/(.*)",
  "/api/cron/(.*)",
  "/partners/(.*)",
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
  },
);

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
