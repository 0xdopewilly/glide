"use client";

import type {
  GlideProfile,
  GlideTokenBalance,
  GlideTransaction,
  GlideWallet,
} from "@/lib/types";
import { useAuth } from "@/context/auth-context";
import {
  readCachedTransactions,
  writeCachedTransactions,
} from "@/lib/transaction-cache";
import {
  readCachedProfile,
  writeCachedProfile,
} from "@/lib/profile-cache";
import { readCachedWallet, writeCachedWallet } from "@/lib/wallet-cache";
import { playSuccessChime } from "@/lib/success-chime";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  transactionsLoading: boolean;
  loading: boolean;
  /** True after profile has been fetched for the signed-in user. */
  profileHydrated: boolean;
  refreshing: boolean;
  error: string | null;
  notice: string | null;
  refresh: () => Promise<void>;
  ensureWallet: () => Promise<GlideWallet | null>;
  createNewWallet: () => Promise<GlideWallet | null>;
  fundWallet: () => Promise<boolean>;
  sendMoney: (
    destinationAddress: string,
    amount: string,
    options?: {
      note?: string;
      requestCode?: string;
      token?: string;
    },
  ) => Promise<boolean>;
  swapMoney: (amount: string) => Promise<boolean>;
  bridgeMoney: (amount: string, network: string) => Promise<boolean>;
  clearError: () => void;
  clearNotice: () => void;
};

const WalletContext = createContext<WalletContextValue | null>(null);

type WalletApiPayload = {
  wallet?: GlideWallet;
  balance?: number;
  tokens?: GlideTokenBalance[];
  totalUsd?: number;
  error?: string;
};

function applyWalletPayload(
  data: WalletApiPayload,
  userId: string,
  setWallet: (w: GlideWallet) => void,
  setBalance: (b: number) => void,
  setTokens: (t: GlideTokenBalance[]) => void,
) {
  if (!data.wallet) throw new Error(data.error ?? "Could not load wallet");
  setWallet(data.wallet);
  writeCachedWallet(data.wallet, userId);
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
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileHydrated, setProfileHydrated] = useState(false);
  const userIdRef = useRef<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const updateProfile = useCallback((patch: Partial<GlideProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...patch };
      const uid = userIdRef.current;
      if (uid) writeCachedProfile(next, uid);
      return next;
    });
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
      const next: GlideProfile = {
        displayName: data.displayName,
        email: data.email,
        username: data.username ?? null,
        avatarUrl: data.avatarUrl ?? null,
      };
      setProfile(next);
      if (userIdRef.current) writeCachedProfile(next, userIdRef.current);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save profile");
      return false;
    }
  }, []);

  const fetchWalletState = useCallback(
    async (w: GlideWallet, userId: string) => {
      const res = await fetch("/api/wallet");
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Could not load wallet");
      }
      const data = (await res.json()) as WalletApiPayload;
      applyWalletPayload(data, userId, setWallet, setBalance, setTokens);
      return data;
    },
    [],
  );

  const fetchTransactions = useCallback(
    async (walletId: string, opts?: { quick?: boolean }) => {
      const uid = userIdRef.current;
      const quick = opts?.quick ?? false;
      if (!quick) setTransactionsLoading(true);

      try {
        const qs = quick ? "&quick=1" : "";
        const res = await fetch(
          `/api/transactions?walletId=${encodeURIComponent(walletId)}${qs}`,
        );
        if (!res.ok) return;
        const data = (await res.json()) as { transactions: GlideTransaction[] };
        const list = data.transactions ?? [];
        setTransactions(list);
        if (uid) writeCachedTransactions(list, uid);
      } finally {
        if (!quick) setTransactionsLoading(false);
      }
    },
    [],
  );

  const loadTransactions = useCallback(
    async (walletId: string) => {
      await fetchTransactions(walletId, { quick: true });
      void fetchTransactions(walletId);
    },
    [fetchTransactions],
  );

  const refresh = useCallback(async () => {
    if (!wallet || !userIdRef.current) return;
    setRefreshing(true);
    setError(null);
    try {
      await fetchWalletState(wallet, userIdRef.current);
      await loadTransactions(wallet.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  }, [wallet, fetchWalletState, loadTransactions]);

  const provisionWallet = useCallback(async () => {
    setError(null);
    setLoading((prev) => (wallet ? prev : true));
    try {
      const uid = userIdRef.current;
      if (!uid) return null;
      const { wallet: w, balance: b, tokens: t } = await loadWalletFromApi();
      setWallet(w);
      writeCachedWallet(w, uid);
      setBalance(b);
      setTokens(t);
      void loadTransactions(w.id);
      return w;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Wallet setup failed");
      return null;
    } finally {
      setLoading(false);
    }
  }, [loadTransactions, wallet]);

  const ensureWallet = useCallback(async () => {
    const uid = userIdRef.current;
    if (wallet && uid) {
      try {
        await fetchWalletState(wallet, uid);
        void loadTransactions(wallet.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load wallet");
      }
      return wallet;
    }
    return provisionWallet();
  }, [wallet, fetchWalletState, loadTransactions, provisionWallet]);

  const createNewWallet = provisionWallet;

  const fundWallet = useCallback(async () => {
    if (!wallet) return false;
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/wallet/fund", { method: "POST" });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Could not request testnet USDC");
      }
      window.setTimeout(() => void refresh(), 3000);
      window.setTimeout(() => void refresh(), 8000);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not request testnet USDC");
      return false;
    }
  }, [wallet, refresh]);

  const sendMoney = useCallback(
    async (
      destinationAddress: string,
      amount: string,
      options?: {
        note?: string;
        requestCode?: string;
        token?: string;
      },
    ) => {
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
            token: options?.token,
            note: options?.note,
            requestCode: options?.requestCode,
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
        void refresh();
        playSuccessChime();
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
        playSuccessChime();
        void refresh();
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
        playSuccessChime();
        void refresh();
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
      userIdRef.current = null;
      setWallet(null);
      setBalance(0);
      setTokens([]);
      setTransactions([]);
      setProfile(DEFAULT_PROFILE);
      setProfileHydrated(false);
      setLoading(false);
      return;
    }

    userIdRef.current = user.id;
    setProfileHydrated(false);

    const cachedProfile = readCachedProfile(user.id);
    if (cachedProfile) {
      setProfile(cachedProfile);
      if (cachedProfile.username) {
        setProfileHydrated(true);
      }
    }

    const cached = readCachedWallet(user.id);
    const cachedTxs = readCachedTransactions(user.id);
    if (cachedTxs?.length) setTransactions(cachedTxs);
    if (cached) {
      setWallet(cached);
      void fetchTransactions(cached.id, { quick: true });
    }
    setLoading(true);

    let cancelled = false;

    void (async () => {
      setError(null);

      let saved: GlideProfile | null = null;
      try {
        saved = await loadProfileFromApi();
        if (!cancelled) {
          const next =
            saved ?? {
              displayName: user.displayName,
              email: user.email,
              avatarUrl: null,
            };
          setProfile(next);
          writeCachedProfile(next, user.id);
        }
      } finally {
        if (!cancelled) setProfileHydrated(true);
      }

      try {
        const { wallet: w, balance: b, tokens: t } = await loadWalletFromApi();
        if (cancelled) return;
        setWallet(w);
        writeCachedWallet(w, user.id);
        setBalance(b);
        setTokens(t);
        void loadTransactions(w.id);

        if (!saved && !cancelled) {
          const refreshed = await loadProfileFromApi();
          if (refreshed) {
            setProfile(refreshed);
            writeCachedProfile(refreshed, user.id);
          }
        }
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
  }, [authReady, user?.id, fetchTransactions, loadTransactions]);

  const value = useMemo(
    () => ({
      profile,
      updateProfile,
      saveProfile,
      wallet,
      balance,
      tokens,
      transactions,
      transactionsLoading,
      loading,
      profileHydrated,
      refreshing,
      error,
      notice,
      refresh,
      ensureWallet,
      createNewWallet,
      fundWallet,
      sendMoney,
      swapMoney,
      bridgeMoney,
      clearError: () => setError(null),
      clearNotice: () => setNotice(null),
    }),
    [
      profile,
      updateProfile,
      saveProfile,
      wallet,
      balance,
      tokens,
      transactions,
      transactionsLoading,
      loading,
      profileHydrated,
      refreshing,
      error,
      notice,
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
