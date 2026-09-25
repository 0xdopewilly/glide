import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ErrorReporter } from "@/components/error-reporter";
import { LaunchSplash } from "@/components/launch-splash";
import { SPLASH_BOOT_SCRIPT } from "@/lib/splash-script";
import { VIEWPORT_BOOT_SCRIPT } from "@/lib/viewport-script";
import { AuthProvider } from "@/context/auth-context";
import { WalletProvider } from "@/context/wallet-context";

// Fallback only (Jakarta renders first), so don't spend first-load bandwidth
// preloading it.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  preload: false,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F9FC" },
    { media: "(prefers-color-scheme: dark)", color: "#0A2F5C" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL("https://app.glidepay.cash"),
  title: "glidepay",
  description: "Send and receive stablecoins instantly. A Cash App for USDC on Arc.",
  manifest: "/manifest.json",
  applicationName: "glidepay",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    shortcut: "/favicon-32.png",
  },
  appleWebApp: {
    title: "glidepay",
    capable: true,
    statusBarStyle: "black-translucent",
  },
  // Next emits only the generic `mobile-web-app-capable`; iOS still keys the
  // full-screen web app (drawing under the status bar and home indicator,
  // instead of black bars) off Apple's legacy tag.
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
  openGraph: {
    type: "website",
    siteName: "glidepay",
    title: "glidepay — money like a text",
    description:
      "Send and receive stablecoins instantly. A Cash App for USDC on Arc.",
    url: "https://app.glidepay.cash",
    images: [
      {
        url: "/icon-512.png",
        width: 512,
        height: 512,
        alt: "glidepay",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "glidepay",
    description:
      "Send and receive stablecoins instantly. A Cash App for USDC on Arc.",
    images: ["/icon-512.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${jakarta.variable} h-full`}
    >
      <head>
        {/* Runs before first paint: see components/launch-splash.tsx. */}
        <script dangerouslySetInnerHTML={{ __html: SPLASH_BOOT_SCRIPT }} />
        {/* iOS 26 double bottom inset: see lib/viewport-script.ts. */}
        <script dangerouslySetInnerHTML={{ __html: VIEWPORT_BOOT_SCRIPT }} />
      </head>
      <body className="h-full font-sans antialiased" suppressHydrationWarning>
        <LaunchSplash />
        <ErrorReporter />
        <ClerkProvider
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
          afterSignOutUrl="/onboarding"
          localization={{
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
          }}
        >
          <ThemeProvider
            attribute="class"
            // Violet (the "dark" theme) is the brand look; Light and Auto stay
            // available under Profile → Appearance.
            defaultTheme="dark"
            enableSystem
            enableColorScheme
            storageKey="glide-theme"
            disableTransitionOnChange
          >
            <AuthProvider>
              <WalletProvider>{children}</WalletProvider>
            </AuthProvider>
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
