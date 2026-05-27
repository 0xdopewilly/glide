import type { GlideChainKey } from "@/lib/chain-meta";

export type GlideProfile = {
  displayName: string;
  email: string;
  username?: string | null;
  avatarUrl?: string | null;
};

export type GlideWallet = {
  id: string;
  address: string;
};

export type GlideTokenBalance = {
  symbol: string;
  amount: number;
  /** Display value in USD (1:1 for USDC/EURC on Arc). */
  usdValue: number;
  chainId: GlideChainKey;
  chainLabel: string;
};

export type TransactionKind = "send" | "receive" | "swap" | "bridge";

export type GlideTransaction = {
  id: string;
  title: string;
  amount: string;
  variant: "credit" | "debit" | "neutral";
  meta: string;
  kind?: TransactionKind;
  status?: string;
  note?: string;
  /** On-chain transaction hash when available */
  txHash?: string;
  /** Block explorer link for sharing */
  explorerUrl?: string;
  /** ISO timestamp for sorting and date filters */
  createdAt?: string;
  /** "@khadee", display name, or 0xab…cd — shown as "To"/"From" on the receipt. */
  counterparty?: string;
  /** Source chain when funds arrived via Universal Receive CCTP sweep. */
  originChain?: string | null;
};

export type WalletResponse = {
  wallet: GlideWallet;
  balance: number;
  tokens: GlideTokenBalance[];
};

export type SendRequest = {
  walletId: string;
  destinationAddress: string;
  amount: string;
};
