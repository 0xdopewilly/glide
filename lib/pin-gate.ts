"use client";

// Imperative bridge between the money-out actions (wallet-context) and the
// global PIN modal (components/pin-gate.tsx). The modal registers a handler on
// mount; callers await requirePin() when a money-out request returns a
// pin_required / pin_setup_required 401, then retry on success.

export type PinMode = "verify" | "setup";

let handler: ((mode: PinMode) => Promise<boolean>) | null = null;

export function registerPinHandler(
  fn: ((mode: PinMode) => Promise<boolean>) | null,
): void {
  handler = fn;
}

/** Prompt the user to verify (or first set) their PIN. Resolves true once the
 * server verified-session is open, false if cancelled or no modal is mounted. */
export function requirePin(mode: PinMode): Promise<boolean> {
  if (!handler) return Promise.resolve(false);
  return handler(mode);
}
