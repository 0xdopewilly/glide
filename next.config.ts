import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";
import pkg from "./package.json" with { type: "json" };

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

// Expose app version + git sha to the client so the Profile screen can read
// them. Vercel already populates VERCEL_GIT_COMMIT_SHA at build; we mirror
// both into NEXT_PUBLIC_* names so the browser bundle sees them.
process.env.NEXT_PUBLIC_APP_VERSION = pkg.version;
if (process.env.VERCEL_GIT_COMMIT_SHA) {
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA =
    process.env.VERCEL_GIT_COMMIT_SHA;
}

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.178"],
  // Don't externalize @circle-fin/developer-controlled-wallets (10.8+) or
  // @circle-fin/adapter-circle-wallets: DCW's "exports" points ESM imports at
  // a .es.js file in a package without "type": "module". Node on Vercel
  // loads that as CommonJS and every route that touches Circle crashes
  // ("Cannot use import statement outside a module"). Bundling them lets the
  // bundler handle the ESM instead.
  serverExternalPackages: ["@circle-fin/app-kit", "@circle-fin/bridge-kit"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.qrserver.com",
        pathname: "/v1/create-qr-code/**",
      },
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
        pathname: "/trustwallet/assets/**",
      },
    ],
  },
  turbopack: {
    root: projectRoot,
  },
  async redirects() {
    return [
      { source: "/privacy", destination: "https://glidepay.cash/privacy", permanent: true },
      { source: "/terms", destination: "https://glidepay.cash/terms", permanent: true },
      { source: "/support", destination: "https://glidepay.cash/support", permanent: true },
    ];
  },
};

export default nextConfig;
