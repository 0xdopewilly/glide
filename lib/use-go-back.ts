"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

/** Navigate to the previous in-app route, or fallback when there is no history. */
export function useGoBack(fallback = "/") {
  const router = useRouter();

  return useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(fallback);
  }, [router, fallback]);
}
