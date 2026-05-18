import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
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
    ],
  },
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
