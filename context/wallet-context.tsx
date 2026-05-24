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
import {
  estimateNetUsdFromTransactions,
  resolveWalletTotalUsd,
} from "@/lib/tokens";
import {
  readCachedWalletBalances,
  writeCachedWalletBalances,
} from "@/lib/wallet-balance-cache";
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
  /** Best-known USD total (on-chain, cache, or activity fallback). */
  totalUsd: number;
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
  swapMoney: (
    amount: string,
    options?: { tokenIn?: string; tokenOut?: string },
  ) => Promise<{ ok: true; receivedAmount?: string } | { ok: false }>;
  bridgeMoney: (amount: string, network: string) => Promise<boolean>;
  clearError: () => void;
  clearNotice: () => void;
};

type ProfileContextValue = Pick<
  WalletContextValue,
  "profile" | "profileHydrated" | "updateProfile" | "saveProfile"
>;

type BalanceContextValue = Pick<
  WalletContextValue,
  "balance" | "totalUsd" | "tokens"
>;

type TransactionsContextValue = Pick<
  WalletContextValue,
  "transactions" | "transactionsLoading"
>;

type WalletActionsContextValue = Pick<
  WalletContextValue,
  | "wallet"
  | "loading"
  | "refreshing"
  | "error"
  | "notice"
  | "refresh"
  | "ensureWallet"
  | "createNewWallet"
  | "fundWallet"
  | "sendMoney"
  | "swapMoney"
  | "bridgeMoney"
  | "clearError"
  | "clearNotice"
>;

const ProfileContext = createContext<ProfileContextValue | null>(null);
const BalanceContext = createContext<BalanceContextValue | null>(null);
const TransactionsContext = createContext<TransactionsContextValue | null>(null);
const WalletActionsContext = createContext<WalletActionsContextValue | null>(
  null,
);

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
  const totalUsd =
    typeof data.totalUsd === "number"
      ? data.totalUsd
      : resolveWalletTotalUsd(data.tokens ?? [], data.balance ?? 0);
  writeCachedWalletBalances(
    {
      balance: data.balance ?? 0,
      tokens: data.tokens ?? [],
      totalUsd,
    },
    userId,
  );
}

async function loadWalletFromApi(options?: {
  walletId?: string;
  full?: boolean;
}): Promise<{
  wallet: GlideWallet;
  balance: number;
  tokens: GlideTokenBalance[];
  totalUsd: number;
}> {
  const params = new URLSearchParams();
  if (options?.walletId) params.set("walletId", options.walletId);
  if (options?.full) params.set("full", "1");

  const useGet = Boolean(options?.walletId);
  const qs = params.toString();
  const url = useGet ? `/api/wallet?${qs}` : `/api/wallet${qs ? `?${qs}` : ""}`;

  const res = await fetch(url, { method: useGet ? "GET" : "POST" });
  const data = (await res.json()) as WalletApiPayload;
  if (!res.ok || !data.wallet) {
    throw new Error(data.error ?? "Could not load wallet");
  }
  const balance = data.balance ?? 0;
  const tokens = data.tokens ?? [];
  const totalUsd =
    typeof data.totalUsd === "number"
      ? data.totalUsd
      : resolveWalletTotalUsd(tokens, balance);
  return {
    wallet: data.wallet,
    balance,
    tokens,
    totalUsd,
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
    async (w: GlideWallet, userId: string, full = false) => {
      const qs = new URLSearchParams({
        walletId: w.id,
        ...(full ? { full: "1" } : {}),
      });
      const res = await fetch(`/api/wallet?${qs}`);
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
      const { wallet: w, balance: b, tokens: t } = await loadWalletFromApi({
        walletId: wallet?.id,
      });
      setWallet(w);
      writeCachedWallet(w, uid);
      setBalance(b);
      setTokens(t);
      writeCachedWalletBalances(
        {
          balance: b,
          tokens: t,
          totalUsd: resolveWalletTotalUsd(t, b),
        },
        uid,
      );
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
    async (
      amount: string,
      options?: { tokenIn?: string; tokenOut?: string },
    ) => {
      if (!wallet) return { ok: false as const };
      setError(null);
      try {
        const res = await fetch("/api/swap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletId: wallet.id,
            amount,
            tokenIn: options?.tokenIn,
            tokenOut: options?.tokenOut,
          }),
        });
        const data = (await res.json()) as {
          receivedAmount?: string;
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "Swap failed");
        playSuccessChime();
        void refresh();
        return {
          ok: true as const,
          receivedAmount: data.receivedAmount,
        };
      } catch (e) {
        setError(e instanceof Error ? e.message : "Swap failed");
        return { ok: false as const };
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
    const cachedBalances = readCachedWalletBalances(user.id);
    const cachedTxs = readCachedTransactions(user.id);
    if (cachedTxs?.length) setTransactions(cachedTxs);
    if (cachedBalances) {
      setBalance(cachedBalances.balance);
      setTokens(cachedBalances.tokens);
    }
    if (cached) {
      setWallet(cached);
      void fetchTransactions(cached.id, { quick: true });
    }
    setLoading(!cachedBalances);

    let cancelled = false;

    void (async () => {
      setError(null);

      const profilePromise = loadProfileFromApi();
      const walletPromise = loadWalletFromApi({
        walletId: cached?.id,
        full: false,
      });

      const [saved, walletResult] = await Promise.all([
        profilePromise.catch(() => null),
        walletPromise.catch((e: unknown) => {
          if (!cancelled) {
            setError(e instanceof Error ? e.message : "Wallet setup failed");
          }
          return null;
        }),
      ]);

      if (!cancelled) {
        const next =
          saved ?? {
            displayName: user.displayName,
            email: user.email,
            avatarUrl: null,
          };
        setProfile(next);
        writeCachedProfile(next, user.id);
        setProfileHydrated(true);
      }

      if (walletResult && !cancelled) {
        const { wallet: w, balance: b, tokens: t, totalUsd } = walletResult;
        setWallet(w);
        writeCachedWallet(w, user.id);
        setBalance(b);
        setTokens(t);
        writeCachedWalletBalances(
          { balance: b, tokens: t, totalUsd },
          user.id,
        );
        void loadTransactions(w.id);
      }

      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [authReady, user?.id, fetchTransactions, loadTransactions]);

  const totalUsd = useMemo(() => {
    const onChain = resolveWalletTotalUsd(tokens, balance);
    if (onChain > 0) return onChain;
    return estimateNetUsdFromTransactions(transactions);
  }, [tokens, balance, transactions]);

  const clearError = useCallback(() => setError(null), []);
  const clearNotice = useCallback(() => setNotice(null), []);

  const profileValue = useMemo<ProfileContextValue>(
    () => ({ profile, profileHydrated, updateProfile, saveProfile }),
    [profile, profileHydrated, updateProfile, saveProfile],
  );

  const balanceValue = useMemo<BalanceContextValue>(
    () => ({ balance, totalUsd, tokens }),
    [balance, totalUsd, tokens],
  );

  const transactionsValue = useMemo<TransactionsContextValue>(
    () => ({ transactions, transactionsLoading }),
    [transactions, transactionsLoading],
  );

  const actionsValue = useMemo<WalletActionsContextValue>(
    () => ({
      wallet,
      loading,
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
      clearError,
      clearNotice,
    }),
    [
      wallet,
      loading,
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
      clearError,
      clearNotice,
    ],
  );

  return (
    <ProfileContext.Provider value={profileValue}>
      <BalanceContext.Provider value={balanceValue}>
        <TransactionsContext.Provider value={transactionsValue}>
          <WalletActionsContext.Provider value={actionsValue}>
            {children}
          </WalletActionsContext.Provider>
        </TransactionsContext.Provider>
      </BalanceContext.Provider>
    </ProfileContext.Provider>
  );
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within WalletProvider");
  return ctx;
}

export function useBalance(): BalanceContextValue {
  const ctx = useContext(BalanceContext);
  if (!ctx) throw new Error("useBalance must be used within WalletProvider");
  return ctx;
}

export function useTransactions(): TransactionsContextValue {
  const ctx = useContext(TransactionsContext);
  if (!ctx)
    throw new Error("useTransactions must be used within WalletProvider");
  return ctx;
}

export function useWalletActions(): WalletActionsContextValue {
  const ctx = useContext(WalletActionsContext);
  if (!ctx)
    throw new Error("useWalletActions must be used within WalletProvider");
  return ctx;
}

export function useWallet(): WalletContextValue {
  const profile = useProfile();
  const balance = useBalance();
  const transactions = useTransactions();
  const actions = useWalletActions();
  return { ...profile, ...balance, ...transactions, ...actions };
}
