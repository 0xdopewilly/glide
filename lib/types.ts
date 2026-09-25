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
  /** Market value in USD: USDC 1:1, EURC and cirBTC at live prices. 0 when
   * there is no price, and always 0 for unverified tokens. */
  usdValue: number;
  chainId: GlideChainKey;
  chainLabel: string;
  /** False for any Arc token other than USDC / EURC / cirBTC (identified by
   * contract address). Unverified tokens never count toward the balance.
   * Missing means verified (older payloads). */
  verified?: boolean;
  /** usdValue is a real market value (false when a price feed is down). */
  priced?: boolean;
  /** Unverified only: token-supplied name (untrusted, display only). */
  name?: string;
  /** Unverified only: Arc contract address — the token's real identity. */
  tokenAddress?: string;
  decimals?: number;
  /** Unverified only: looks like spam or a fake of a real token. Hidden by
   * default and not offered for sending. */
  suspicious?: boolean;
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
  /** The other side's wallet address (payments only) — opens the thread. */
  counterpartyAddress?: string;
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
