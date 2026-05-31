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
  serverExternalPackages: [
    "@circle-fin/app-kit",
    "@circle-fin/adapter-circle-wallets",
    "@circle-fin/bridge-kit",
    "@circle-fin/developer-controlled-wallets",
  ],
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
};

export default nextConfig;
