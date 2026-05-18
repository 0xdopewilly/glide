"use client";

import { STORAGE_KEYS } from "@/lib/storage-keys";
import type {
  GlideProfile,
  GlideTransaction,
  GlideWallet,
} from "@/lib/types";
import { useAuth } from "@/context/auth-context";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const DEFAULT_PROFILE: GlideProfile = {
  displayName: "Guest",
  email: "",
};

type WalletContextValue = {
  profile: GlideProfile;
  updateProfile: (patch: Partial<GlideProfile>) => void;
  wallet: GlideWallet | null;
  balance: number;
  transactions: GlideTransaction[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  ensureWallet: () => Promise<GlideWallet | null>;
  createNewWallet: () => Promise<GlideWallet | null>;
  fundWallet: () => Promise<boolean>;
  sendMoney: (destinationAddress: string, amount: string) => Promise<boolean>;
  addLocalTransaction: (tx: GlideTransaction) => void;
  clearError: () => void;
};

const WalletContext = createContext<WalletContextValue | null>(null);

function readProfile(): GlideProfile {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.profile);
    if (!raw) return DEFAULT_PROFILE;
    return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PROFILE;
  }
}

function readLocalTransactions(): GlideTransaction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.localTransactions);
    if (!raw) return [];
    return JSON.parse(raw) as GlideTransaction[];
  } catch {
    return [];
  }
}

async function loadWalletFromApi(): Promise<{
  wallet: GlideWallet;
  balance: number;
}> {
  const res = await fetch("/api/wallet", { method: "POST" });
  const data = (await res.json()) as {
    wallet?: GlideWallet;
    balance?: number;
    error?: string;
  };
  if (!res.ok || !data.wallet) {
    throw new Error(data.error ?? "Could not load wallet");
  }
  return { wallet: data.wallet, balance: data.balance ?? 0 };
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { user, ready: authReady } = useAuth();
  const [profile, setProfile] = useState<GlideProfile>(DEFAULT_PROFILE);
  const [wallet, setWallet] = useState<GlideWallet | null>(null);
  const [balance, setBalance] = useState(0);
  const [circleTransactions, setCircleTransactions] = useState<GlideTransaction[]>(
    [],
  );
  const [localTransactions, setLocalTransactions] = useState<GlideTransaction[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const updateProfile = useCallback((patch: Partial<GlideProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(next));
      return next;
    });
  }, []);

  const addLocalTransaction = useCallback((tx: GlideTransaction) => {
    setLocalTransactions((prev) => {
      const next = [tx, ...prev];
      localStorage.setItem(STORAGE_KEYS.localTransactions, JSON.stringify(next));
      return next;
    });
  }, []);

  const fetchWalletState = useCallback(async (w: GlideWallet) => {
    const res = await fetch(`/api/wallet?walletId=${encodeURIComponent(w.id)}`);
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      throw new Error(data.error ?? "Could not load wallet");
    }
    const data = (await res.json()) as { wallet: GlideWallet; balance: number };
    setWallet(data.wallet);
    setBalance(data.balance);
    return data;
  }, []);

  const fetchTransactions = useCallback(async (walletId: string) => {
    const res = await fetch(
      `/api/transactions?walletId=${encodeURIComponent(walletId)}`,
    );
    if (!res.ok) return;
    const data = (await res.json()) as { transactions: GlideTransaction[] };
    setCircleTransactions(data.transactions ?? []);
  }, []);

  const refresh = useCallback(async () => {
    if (!wallet) return;
    setError(null);
    try {
      await fetchWalletState(wallet);
      await fetchTransactions(wallet.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refresh failed");
    }
  }, [wallet, fetchWalletState, fetchTransactions]);

  const provisionWallet = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const { wallet: w, balance: b } = await loadWalletFromApi();
      setWallet(w);
      setBalance(b);
      await fetchTransactions(w.id);
      return w;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Wallet setup failed");
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchTransactions]);

  const ensureWallet = useCallback(async () => {
    if (wallet) {
      try {
        await fetchWalletState(wallet);
        await fetchTransactions(wallet.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load wallet");
      }
      return wallet;
    }
    return provisionWallet();
  }, [wallet, fetchWalletState, fetchTransactions, provisionWallet]);

  const createNewWallet = provisionWallet;

  const fundWallet = useCallback(async () => {
    if (!wallet) return false;
    setError(null);
    try {
      const res = await fetch("/api/wallet/fund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: wallet.address }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Could not add funds");
      }
      window.setTimeout(() => void refresh(), 3000);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add funds");
      return false;
    }
  }, [wallet, refresh]);

  const sendMoney = useCallback(
    async (destinationAddress: string, amount: string) => {
      if (!wallet) return false;
      setError(null);
      try {
        const res = await fetch("/api/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletId: wallet.id,
            destinationAddress,
            amount,
          }),
        });
        const data = (await res.json()) as {
          balance?: number;
          error?: string;
        };
        if (!res.ok) {
          throw new Error(data.error ?? "Transfer failed");
        }
        if (typeof data.balance === "number") setBalance(data.balance);
        addLocalTransaction({
          id: `local-${Date.now()}`,
          title: `Sent to ${destinationAddress.slice(0, 6)}...${destinationAddress.slice(-4)}`,
          amount: `−$${parseFloat(amount).toFixed(2)}`,
          variant: "debit",
          meta: "Just now",
          kind: "send",
          status: "pending",
        });
        window.setTimeout(() => void refresh(), 2000);
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Transfer failed");
        return false;
      }
    },
    [wallet, refresh, addLocalTransaction],
  );

  useEffect(() => {
    if (!authReady) return;

    if (!user) {
      setWallet(null);
      setBalance(0);
      setCircleTransactions([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setProfile(readProfile());
    setLocalTransactions(readLocalTransactions());
    updateProfile({
      displayName: user.displayName,
      email: user.email,
    });

    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const { wallet: w, balance: b } = await loadWalletFromApi();
        if (cancelled) return;
        setWallet(w);
        setBalance(b);
        await fetchTransactions(w.id);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Wallet setup failed");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authReady, user?.id, user?.displayName, user?.email, fetchTransactions, updateProfile]);

  const transactions = useMemo(() => {
    const merged = [...localTransactions, ...circleTransactions];
    const seen = new Set<string>();
    return merged.filter((tx) => {
      if (seen.has(tx.id)) return false;
      seen.add(tx.id);
      return true;
    });
  }, [localTransactions, circleTransactions]);

  const value = useMemo(
    () => ({
      profile,
      updateProfile,
      wallet,
      balance,
      transactions,
      loading,
      error,
      refresh,
      ensureWallet,
      createNewWallet,
      fundWallet,
      sendMoney,
      addLocalTransaction,
      clearError: () => setError(null),
    }),
    [
      profile,
      updateProfile,
      wallet,
      balance,
      transactions,
      loading,
      error,
      refresh,
      ensureWallet,
      createNewWallet,
      fundWallet,
      sendMoney,
      addLocalTransaction,
    ],
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
