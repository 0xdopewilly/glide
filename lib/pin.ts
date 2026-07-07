import { prisma } from "@/lib/db";
import crypto from "node:crypto";

export const PIN_LENGTH = 6;
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60_000; // 5 min lockout after too many wrong tries
const VERIFY_TTL_MS = 5 * 60_000; // money-out stays unlocked 5 min after a correct PIN

export function isValidPin(pin: string): boolean {
  return new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin);
}

/** scrypt hash, stored as "scrypt$salt$key". */
function hashPin(pin: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const key = crypto.scryptSync(pin, salt, 32).toString("hex");
  return `scrypt$${salt}$${key}`;
}

function verifyHash(pin: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, expected] = parts;
  const key = crypto.scryptSync(pin, salt, 32);
  const exp = Buffer.from(expected, "hex");
  return key.length === exp.length && crypto.timingSafeEqual(key, exp);
}

export type PinStatus = { isSet: boolean; lockedUntil: string | null };

export async function getPinStatus(userId: string): Promise<PinStatus> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { pinHash: true, pinLockedUntil: true },
  });
  const locked =
    u?.pinLockedUntil && u.pinLockedUntil > new Date()
      ? u.pinLockedUntil.toISOString()
      : null;
  return { isSet: Boolean(u?.pinHash), lockedUntil: locked };
}

/** Set (first time) or change the PIN. Changing requires the current PIN.
 * Setting also opens the verified session so the pending money-out can proceed. */
export async function setUserPin(
  userId: string,
  input: { pin: string; currentPin?: string },
): Promise<{ ok: boolean; error?: string }> {
  if (!isValidPin(input.pin)) {
    return { ok: false, error: `PIN must be ${PIN_LENGTH} digits.` };
  }
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { pinHash: true },
  });
  if (u?.pinHash) {
    if (!input.currentPin || !verifyHash(input.currentPin, u.pinHash)) {
      return { ok: false, error: "Current PIN is incorrect." };
    }
  }
  await prisma.user.update({
    where: { id: userId },
    data: {
      pinHash: hashPin(input.pin),
      pinSetAt: new Date(),
      pinFailedAttempts: 0,
      pinLockedUntil: null,
      pinVerifiedUntil: new Date(Date.now() + VERIFY_TTL_MS),
    },
  });
  return { ok: true };
}

/** Reset the PIN using the authenticated Clerk session (forgot-PIN). Clears the
 * old PIN so the user can set a fresh one. */
export async function resetUserPin(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      pinHash: null,
      pinSetAt: null,
      pinFailedAttempts: 0,
      pinLockedUntil: null,
      pinVerifiedUntil: null,
    },
  });
}

export type VerifyResult = {
  ok: boolean;
  error?: string;
  remaining?: number;
  lockedUntil?: string;
};

export async function verifyUserPin(
  userId: string,
  pin: string,
): Promise<VerifyResult> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { pinHash: true, pinFailedAttempts: true, pinLockedUntil: true },
  });
  if (!u?.pinHash) return { ok: false, error: "No PIN set." };

  const now = new Date();
  if (u.pinLockedUntil && u.pinLockedUntil > now) {
    return {
      ok: false,
      error: "Too many attempts. Try again later.",
      lockedUntil: u.pinLockedUntil.toISOString(),
    };
  }

  if (!isValidPin(pin) || !verifyHash(pin, u.pinHash)) {
    const attempts = (u.pinFailedAttempts ?? 0) + 1;
    const locked = attempts >= MAX_ATTEMPTS;
    const lockedUntil = locked ? new Date(Date.now() + LOCKOUT_MS) : null;
    await prisma.user.update({
      where: { id: userId },
      data: {
        pinFailedAttempts: locked ? 0 : attempts,
        pinLockedUntil: lockedUntil,
      },
    });
    return {
      ok: false,
      error: "Incorrect PIN.",
      remaining: locked ? 0 : MAX_ATTEMPTS - attempts,
      lockedUntil: lockedUntil?.toISOString(),
    };
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      pinFailedAttempts: 0,
      pinLockedUntil: null,
      pinVerifiedUntil: new Date(Date.now() + VERIFY_TTL_MS),
    },
  });
  return { ok: true };
}

/** Gate for money-out routes. */
export async function assertPinVerified(
  userId: string,
): Promise<{ ok: true } | { ok: false; code: "pin_setup_required" | "pin_required" }> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { pinHash: true, pinVerifiedUntil: true },
  });
  if (!u?.pinHash) return { ok: false, code: "pin_setup_required" };
  if (!u.pinVerifiedUntil || u.pinVerifiedUntil <= new Date()) {
    return { ok: false, code: "pin_required" };
  }
  return { ok: true };
}
