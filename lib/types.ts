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
  /** On-chain transaction hash when available */
  txHash?: string;
  /** Block explorer link for sharing */
  explorerUrl?: string;
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
