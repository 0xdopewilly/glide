"use client";

import { reportClientError } from "@/lib/report-error";
import { useEffect } from "react";

/** Installs global window `error` + `unhandledrejection` listeners once and
 * beacons them to /api/log. Mounted in the root layout so it covers every page
 * (including unauthenticated ones). Renders nothing. */
export function ErrorReporter() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      reportClientError({
        source: "window.onerror",
        message: e.message || "unknown error",
        stack: e.error instanceof Error ? e.error.stack : undefined,
      });
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const reason = e.reason;
      reportClientError({
        source: "unhandledrejection",
        message: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
      });
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
