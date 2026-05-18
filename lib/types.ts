export type GlideProfile = {
  displayName: string;
  email: string;
};

export type GlideWallet = {
  id: string;
  address: string;
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
};

export type WalletResponse = {
  wallet: GlideWallet;
  balance: number;
};

export type SendRequest = {
  walletId: string;
  destinationAddress: string;
  amount: string;
};
