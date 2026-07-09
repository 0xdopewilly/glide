"use client";

/**
 * Haptic feedback — best-effort, never throws.
 *
 * On the native Capacitor build (iOS/Android) it uses @capacitor/haptics for
 * true taptic feedback. On the web it falls back to the Vibration API where
 * supported (Android Chrome; iOS Safari has none, so it's a silent no-op).
 * Feedback is a nicety layered on top of real UI state — callers must never
 * depend on it actually firing.
 */

type HapticsModule = typeof import("@capacitor/haptics");

type Loaded = { native: true; h: HapticsModule } | { native: false; h: null };

let loadPromise: Promise<Loaded> | null = null;

function ensureLoaded(): Promise<Loaded> {
  if (loadPromise) return loadPromise;
  loadPromise = (async (): Promise<Loaded> => {
    try {
      const { Capacitor } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform()) return { native: false, h: null };
      const h = await import("@capacitor/haptics");
      return { native: true, h };
    } catch {
      return { native: false, h: null };
    }
  })();
  return loadPromise;
}

function vibrate(pattern: number | number[]) {
  try {
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.vibrate === "function"
    ) {
      navigator.vibrate(pattern);
    }
  } catch {
    /* no-op */
  }
}

type Weight = "light" | "medium" | "heavy";
type Notify = "success" | "warning" | "error";

function impact(weight: Weight) {
  if (typeof window === "undefined") return;
  void ensureLoaded().then((m) => {
    try {
      if (m.native) {
        const style =
          weight === "heavy"
            ? m.h.ImpactStyle.Heavy
            : weight === "medium"
              ? m.h.ImpactStyle.Medium
              : m.h.ImpactStyle.Light;
        void m.h.Haptics.impact({ style });
      } else {
        vibrate(weight === "heavy" ? 18 : weight === "medium" ? 12 : 7);
      }
    } catch {
      /* best-effort */
    }
  });
}

function notify(kind: Notify) {
  if (typeof window === "undefined") return;
  void ensureLoaded().then((m) => {
    try {
      if (m.native) {
        const type =
          kind === "error"
            ? m.h.NotificationType.Error
            : kind === "warning"
              ? m.h.NotificationType.Warning
              : m.h.NotificationType.Success;
        void m.h.Haptics.notification({ type });
      } else {
        vibrate(
          kind === "error"
            ? [10, 40, 10]
            : kind === "warning"
              ? [8, 30, 8]
              : [6, 30, 14],
        );
      }
    } catch {
      /* best-effort */
    }
  });
}

/** Tasteful, named haptic moments. Import and call directly, e.g.
 * `haptics.success()` after a transfer, `haptics.light()` on a tab tap. */
export const haptics = {
  light: () => impact("light"),
  medium: () => impact("medium"),
  heavy: () => impact("heavy"),
  success: () => notify("success"),
  warning: () => notify("warning"),
  error: () => notify("error"),
};
