import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "glidepay",
    short_name: "glidepay",
    description: "Move money instantly. Simple, fast, and familiar.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#DCFCE7",
    theme_color: "#DCFCE7",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-256.png",
        sizes: "256x256",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-384.png",
        sizes: "384x384",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      // Same files marked as "maskable" — iOS / Android can crop into circle / squircle
      // shapes. The wordmark sits in the safe centre of the square, so cropping is
      // fine even at aggressive rounding.
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
