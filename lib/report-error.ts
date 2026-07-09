"use client";

type ErrorInfo = {
  source: string;
  message: string;
  digest?: string;
  stack?: string;
  url?: string;
};

/** Best-effort client→server error beacon. Client-side console.errors are
 * invisible to the operator; this surfaces them into server logs (see
 * /api/log). Uses sendBeacon so it survives an unloading page, falls back to
 * keepalive fetch. Never throws. */
export function reportClientError(info: ErrorInfo): void {
  if (typeof window === "undefined") return;
  try {
    const body = JSON.stringify({
      source: String(info.source ?? "unknown").slice(0, 60),
      message: String(info.message ?? "").slice(0, 500),
      digest: info.digest ? String(info.digest).slice(0, 100) : undefined,
      stack: info.stack ? String(info.stack).slice(0, 2000) : undefined,
      url: info.url ?? window.location?.href,
    });
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(
        "/api/log",
        new Blob([body], { type: "application/json" }),
      );
    } else {
      void fetch("/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      });
    }
  } catch {
    /* best-effort — reporting must never itself throw */
  }
}
