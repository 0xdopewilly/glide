"use client";

/**
 * Next.js remounts this on each navigation so AnimatePresence can exit the
 * previous page before the next one enters (no double-load flash).
 */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
