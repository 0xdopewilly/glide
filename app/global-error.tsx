"use client";

import { reportClientError } from "@/lib/report-error";
import { useEffect } from "react";

/** Last-resort boundary: catches errors thrown in the root layout itself.
 * It replaces the whole document, so it must render its own <html>/<body> and
 * cannot rely on globals.css tokens — styling is inline and self-contained. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Glide] global error", error?.digest ?? error?.message ?? "");
    reportClientError({
      source: "global-error-boundary",
      message: error?.message ?? "global error",
      digest: error?.digest,
      stack: error?.stack,
    });
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#062448",
          color: "#fff",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "360px" }}>
          <div style={{ fontSize: "15px", fontWeight: 700, letterSpacing: "-0.01em" }}>
            glidepay hit a snag
          </div>
          <p
            style={{
              marginTop: "8px",
              fontSize: "14px",
              lineHeight: 1.5,
              color: "rgba(255,255,255,0.72)",
            }}
          >
            The app ran into an unexpected error. Your money and data are safe.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "24px",
              width: "100%",
              border: "none",
              borderRadius: "999px",
              padding: "13px 24px",
              fontSize: "14px",
              fontWeight: 700,
              color: "#fff",
              background: "#5B3DF5",
              cursor: "pointer",
            }}
          >
            Reload glidepay
          </button>
        </div>
      </body>
    </html>
  );
}
