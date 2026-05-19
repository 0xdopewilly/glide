"use client";

import type {
  GlideProfile,
  GlideTokenBalance,
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
  saveProfile: (patch: Partial<GlideProfile>) => Promise<boolean>;
  wallet: GlideWallet | null;
  balance: number;
  tokens: GlideTokenBalance[];
  transactions: GlideTransaction[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  ensureWallet: () => Promise<GlideWallet | null>;
  createNewWallet: () => Promise<GlideWallet | null>;
  fundWallet: () => Promise<boolean>;
  sendMoney: (destinationAddress: string, amount: string) => Promise<boolean>;
  swapMoney: (amount: string) => Promise<boolean>;
  bridgeMoney: (amount: string, network: string) => Promise<boolean>;
  clearError: () => void;
};

const WalletContext = createContext<WalletContextValue | null>(null);

type WalletApiPayload = {
  wallet?: GlideWallet;
  balance?: number;
  tokens?: GlideTokenBalance[];
  error?: string;
};

function applyWalletPayload(
  data: WalletApiPayload,
  setWallet: (w: GlideWallet) => void,
  setBalance: (b: number) => void,
  setTokens: (t: GlideTokenBalance[]) => void,
) {
  if (!data.wallet) throw new Error(data.error ?? "Could not load wallet");
  setWallet(data.wallet);
  setBalance(data.balance ?? 0);
  setTokens(data.tokens ?? []);
}

async function loadWalletFromApi(): Promise<{
  wallet: GlideWallet;
  balance: number;
  tokens: GlideTokenBalance[];
}> {
  const res = await fetch("/api/wallet", { method: "POST" });
  const data = (await res.json()) as WalletApiPayload;
  if (!res.ok || !data.wallet) {
    throw new Error(data.error ?? "Could not load wallet");
  }
  return {
    wallet: data.wallet,
    balance: data.balance ?? 0,
    tokens: data.tokens ?? [],
  };
}

async function loadProfileFromApi(): Promise<GlideProfile | null> {
  const res = await fetch("/api/profile");
  if (!res.ok) return null;
  return (await res.json()) as GlideProfile;
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { user, ready: authReady } = useAuth();
  const [profile, setProfile] = useState<GlideProfile>(DEFAULT_PROFILE);
  const [wallet, setWallet] = useState<GlideWallet | null>(null);
  const [balance, setBalance] = useState(0);
  const [tokens, setTokens] = useState<GlideTokenBalance[]>([]);
  const [transactions, setTransactions] = useState<GlideTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateProfile = useCallback((patch: Partial<GlideProfile>) => {
    setProfile((prev) => ({ ...prev, ...patch }));
  }, []);

  const saveProfile = useCallback(async (patch: Partial<GlideProfile>) => {
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = (await res.json()) as GlideProfile & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not save profile");
      setProfile({
        displayName: data.displayName,
        email: data.email,
      });
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save profile");
      return false;
    }
  }, []);

  const fetchWalletState = useCallback(async (w: GlideWallet) => {
    const res = await fetch("/api/wallet");
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      throw new Error(data.error ?? "Could not load wallet");
    }
    const data = (await res.json()) as WalletApiPayload;
    applyWalletPayload(data, setWallet, setBalance, setTokens);
    return data;
  }, []);

  const fetchTransactions = useCallback(async (walletId: string) => {
    const res = await fetch(
      `/api/transactions?walletId=${encodeURIComponent(walletId)}`,
    );
    if (!res.ok) return;
    const data = (await res.json()) as { transactions: GlideTransaction[] };
    setTransactions(data.transactions ?? []);
  }, []);

  const refresh = useCallback(async () => {
    if (!wallet) return;
    setRefreshing(true);
    setError(null);
    try {
      await fetchWalletState(wallet);
      await fetchTransactions(wallet.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  }, [wallet, fetchWalletState, fetchTransactions]);

  const provisionWallet = useCallback(async () => {
    setError(null);
    setLoading((prev) => (wallet ? prev : true));
    try {
      const { wallet: w, balance: b, tokens: t } = await loadWalletFromApi();
      setWallet(w);
      setBalance(b);
      setTokens(t);
      await fetchTransactions(w.id);
      return w;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Wallet setup failed");
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchTransactions, wallet]);

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
      const res = await fetch("/api/wallet/fund", { method: "POST" });
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
        window.setTimeout(() => void refresh(), 2500);
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Transfer failed");
        return false;
      }
    },
    [wallet, refresh],
  );

  const swapMoney = useCallback(
    async (amount: string) => {
      if (!wallet) return false;
      setError(null);
      try {
        const res = await fetch("/api/swap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletId: wallet.id, amount }),
        });
        const data = (await res.json()) as {
          balance?: number;
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "Swap failed");
        if (typeof data.balance === "number") setBalance(data.balance);
        await refresh();
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Swap failed");
        return false;
      }
    },
    [wallet, refresh],
  );

  const bridgeMoney = useCallback(
    async (amount: string, network: string) => {
      if (!wallet) return false;
      setError(null);
      try {
        const res = await fetch("/api/bridge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletId: wallet.id, amount, network }),
        });
        const data = (await res.json()) as {
          balance?: number;
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "Bridge failed");
        if (typeof data.balance === "number") setBalance(data.balance);
        await refresh();
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Bridge failed");
        return false;
      }
    },
    [wallet, refresh],
  );

  useEffect(() => {
    if (!authReady) return;

    if (!user) {
      setWallet(null);
      setBalance(0);
      setTokens([]);
      setTransactions([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      setLoading((prev) => (wallet ? prev : true));
      setError(null);

      const saved = await loadProfileFromApi();
      if (!cancelled) {
        setProfile(
          saved ?? {
            displayName: user.displayName,
            email: user.email,
          },
        );
      }

      try {
        const { wallet: w, balance: b, tokens: t } = await loadWalletFromApi();
        if (cancelled) return;
        setWallet(w);
        setBalance(b);
        setTokens(t);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload wallet when user id changes
  }, [authReady, user?.id, user?.displayName, user?.email, fetchTransactions]);

  const value = useMemo(
    () => ({
      profile,
      updateProfile,
      saveProfile,
      wallet,
      balance,
      tokens,
      transactions,
      loading,
      refreshing,
      error,
      refresh,
      ensureWallet,
      createNewWallet,
      fundWallet,
      sendMoney,
      swapMoney,
      bridgeMoney,
      clearError: () => setError(null),
    }),
    [
      profile,
      updateProfile,
      saveProfile,
      wallet,
      balance,
      tokens,
      transactions,
      loading,
      refreshing,
      error,
      refresh,
      ensureWallet,
      createNewWallet,
      fundWallet,
      sendMoney,
      swapMoney,
      bridgeMoney,
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
