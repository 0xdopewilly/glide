import type { AuthProvider } from "@/lib/auth-types";
import { STORAGE_KEYS } from "@/lib/storage-keys";

export type StoredAccount = {
  email: string;
  displayName: string;
  provider: AuthProvider;
};

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function readAccounts(): StoredAccount[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.accounts);
    if (!raw) return [];
    return JSON.parse(raw) as StoredAccount[];
  } catch {
    return [];
  }
}

export function findAccount(email: string): StoredAccount | undefined {
  const normalized = normalizeEmail(email);
  return readAccounts().find((a) => a.email === normalized);
}

export function saveAccount(account: StoredAccount) {
  const normalized = normalizeEmail(account.email);
  const rest = readAccounts().filter((a) => a.email !== normalized);
  const next = [...rest, { ...account, email: normalized }];
  localStorage.setItem(STORAGE_KEYS.accounts, JSON.stringify(next));
}
