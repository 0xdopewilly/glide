import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor wraps the live PWA at glide-arc.vercel.app in a native iOS +
 * Android shell. The `server.url` approach (vs a static-export bundled
 * build) means:
 *  - Every Vercel deploy ships to the wrapped app instantly. No store review
 *    for non-native code changes.
 *  - All server routes (Clerk auth, Circle wallets, /api/agent, webhooks)
 *    keep working unchanged — they're called against the same URL the web
 *    app uses.
 *  - The native shell is intentionally thin: it provides splash, push,
 *    biometrics, deep links, share sheets — things only a real app can do.
 */
const config: CapacitorConfig = {
  appId: "com.glidepay.app",
  appName: "glidepay",
  webDir: "out", // unused with server.url, but Capacitor requires this field
  server: {
    url: "https://app.glidepay.cash",
    cleartext: false,
    androidScheme: "https",
  },
  backgroundColor: "#050505",
  ios: {
    contentInset: "always",
    backgroundColor: "#050505",
  },
  android: {
    backgroundColor: "#050505",
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: "#050505",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: false,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    StatusBar: {
      backgroundColor: "#050505",
      style: "DARK",
      overlaysWebView: false,
    },
  },
};

export default config;
