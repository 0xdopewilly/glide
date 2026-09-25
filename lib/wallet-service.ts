import type { Blockchain } from "@circle-fin/developer-controlled-wallets";
import {
  createCircleClient,
  getOrCreateWalletSetId,
  GLIDE_BLOCKCHAIN,
  safeApiError,
} from "@/lib/circle";
import { fetchOffArcUsdcBalances } from "@/lib/chain-balances";
import { CHAIN_META } from "@/lib/chain-meta";
import {
  ARC_DISPLAY_TOKENS,
  addressesEqual,
  classifyArcToken,
  isEurcToken,
  normalizeTokenSymbol,
} from "@/lib/tokens";
import { getTokenPrices } from "@/lib/prices";
import {
  isSuspiciousToken,
  sanitizeTokenText,
  TOKEN_NAME_MAX,
  TOKEN_SYMBOL_MAX,
} from "@/lib/token-safety";
import type { GlideTokenBalance, GlideWallet } from "@/lib/types";

const ARC_CHAIN = CHAIN_META["arc-testnet"];

export async function createGlideWallet(): Promise<GlideWallet> {
  return createWalletOnChain(GLIDE_BLOCKCHAIN);
}

/** Create a Circle SCA on any supported blockchain. Used by Universal Receive
 * to spin up Base/Eth/Polygon/Arbitrum wallets for the same wallet set so the
 * user has one identity across chains. */
export async function createWalletOnChain(
  blockchain: string,
): Promise<GlideWallet> {
  const initialized = createCircleClient();
  if ("error" in initialized) throw new Error(initialized.error);

  const { client } = initialized;
  const walletSetId = await getOrCreateWalletSetId(client);

  const walletsResponse = await client.createWallets({
    walletSetId,
    blockchains: [blockchain as Blockchain],
    count: 1,
    accountType: "SCA",
  });

  const wallet = walletsResponse.data?.wallets?.[0];
  if (!wallet?.id || !wallet?.address) {
    throw new Error(`Wallet creation incomplete on ${blockchain}`);
  }

  return { id: wallet.id, address: wallet.address };
}

type TokenRow = {
  amount: number;
  symbol?: string;
  tokenAddress?: string;
  isNative?: boolean;
  tokenId?: string;
};

/** Maps a raw balance row to the symbol we credit it as, or null to drop it.
 * Must identify tokens by contract address: symbols and names are spoofable. */
type TokenClassifier = (row: {
  tokenAddress?: string;
  isNative?: boolean;
}) => string | null;

async function fetchTokenRows(
  walletId: string,
  classify: TokenClassifier,
): Promise<TokenRow[]> {
  const initialized = createCircleClient();
  if ("error" in initialized) {
    throw new Error(initialized.error);
  }

  const balances = await initialized.client.getWalletTokenBalance({
    id: walletId,
  });

  const raw = (balances.data?.tokenBalances ?? []).flatMap((entry) => {
    const row = {
      amount: parseFloat(entry.amount ?? "0"),
      tokenAddress: entry.token?.tokenAddress?.toLowerCase(),
      isNative: entry.token?.isNative,
      tokenId: entry.token?.id,
    };
    const symbol = classify(row);
    return symbol ? [{ ...row, symbol }] : [];
  });

  // Arc-specific: USDC is BOTH the chain's native gas token AND an ERC-20.
  // Circle's API returns the same balance twice (once with isNative:true, no
  // tokenAddress; once as the ERC-20 at 0x3600...). When both exist for the
  // same symbol, drop the native shadow - the ERC-20 row has the correct
  // 6-decimal precision and is the canonical representation.
  const symbolsWithErc20 = new Set(
    raw
      .filter((r) => r.tokenAddress && !r.isNative && r.symbol)
      .map((r) => r.symbol!.toUpperCase()),
  );
  const filtered = raw.filter((r) => {
    if (r.isNative && r.symbol && symbolsWithErc20.has(r.symbol.toUpperCase())) {
      return false;
    }
    return true;
  });

  // Then dedupe by tokenAddress in case Circle ever returns the same ERC-20
  // entry twice (different tokenIds at the same contract).
  const byAddress = new Map<string, TokenRow>();
  const anonymous: TokenRow[] = [];
  for (const row of filtered) {
    if (!row.tokenAddress) {
      anonymous.push(row);
      continue;
    }
    const existing = byAddress.get(row.tokenAddress);
    if (!existing || row.amount > existing.amount) {
      byAddress.set(row.tokenAddress, row);
    }
  }
  return [...byAddress.values(), ...anonymous];
}

/** Amounts of the verified Arc tokens (USDC, EURC, cirBTC), by symbol. No
 * prices: balance checks on the send path don't need them. */
async function fetchVerifiedAmounts(walletId: string): Promise<Map<string, number>> {
  const rows = await fetchTokenRows(walletId, classifyArcToken);
  const amounts = new Map<string, number>();
  for (const row of rows) {
    if (Number.isNaN(row.amount) || row.amount <= 0) continue;
    const symbol = normalizeTokenSymbol(row.symbol);
    amounts.set(symbol, (amounts.get(symbol) ?? 0) + row.amount);
  }
  return amounts;
}

/** The verified tokens with USD values: USDC 1:1, EURC and cirBTC at live
 * prices (0 and `priced: false` when no price is available). */
export async function fetchWalletTokenBalances(
  walletId: string,
): Promise<GlideTokenBalance[]> {
  const amounts = await fetchVerifiedAmounts(walletId);
  const needsPrices = (amounts.get("EURC") ?? 0) > 0 || (amounts.get("cirBTC") ?? 0) > 0;
  const prices = needsPrices ? await getTokenPrices() : null;

  return ARC_DISPLAY_TOKENS.map((symbol) => {
    const amount = amounts.get(normalizeTokenSymbol(symbol)) ?? 0;
    const price =
      symbol === "USDC" ? 1 : symbol === "EURC" ? prices?.EURC : prices?.cirBTC;
    return {
      symbol,
      amount,
      usdValue: price ? amount * price : 0,
      priced: symbol === "USDC" || Boolean(price),
      verified: true,
      chainId: ARC_CHAIN.id,
      chainLabel: ARC_CHAIN.label,
    };
  });
}

const MAX_UNVERIFIED = 50;

type RawBalance = {
  amount?: string;
  token?: {
    tokenAddress?: string;
    isNative?: boolean;
    blockchain?: string;
    standard?: string;
    symbol?: string;
    name?: string;
    decimals?: number;
  };
};

function toUnverified(entry: RawBalance): GlideTokenBalance | null {
  const token = entry.token;
  const address = token?.tokenAddress?.toLowerCase();
  const amount = parseFloat(entry.amount ?? "0");
  if (!token || !address || token.isNative) return null;
  if (token.blockchain !== GLIDE_BLOCKCHAIN) return null;
  if (token.standard && token.standard !== "ERC20") return null; // NFTs
  if (!Number.isFinite(amount) || amount <= 0) return null;
  if (classifyArcToken({ tokenAddress: address, isNative: false })) return null;

  const symbol = sanitizeTokenText(token.symbol, TOKEN_SYMBOL_MAX);
  const name = sanitizeTokenText(token.name, TOKEN_NAME_MAX) || symbol;
  return {
    symbol: symbol || "Unknown",
    name,
    amount,
    usdValue: 0,
    priced: false,
    verified: false,
    suspicious: isSuspiciousToken({ symbol, name }),
    tokenAddress: address,
    decimals: typeof token.decimals === "number" ? token.decimals : undefined,
    chainId: ARC_CHAIN.id,
    chainLabel: ARC_CHAIN.label,
  };
}

/** Every other token the wallet holds on Arc (memes, airdrops, anything).
 * Display and sending only: never counted in the balance, never shown to the
 * assistant, never fed to automations. */
export async function fetchUnverifiedArcTokens(
  walletId: string,
): Promise<GlideTokenBalance[]> {
  const initialized = createCircleClient();
  if ("error" in initialized) throw new Error(initialized.error);
  const res = await initialized.client.getWalletTokenBalance({
    id: walletId,
    includeAll: true,
  });
  const out: GlideTokenBalance[] = [];
  const seen = new Set<string>();
  for (const entry of (res.data?.tokenBalances ?? []) as RawBalance[]) {
    const row = toUnverified(entry);
    if (!row || seen.has(row.tokenAddress!)) continue;
    seen.add(row.tokenAddress!);
    out.push(row);
  }
  out.sort(
    (a, b) =>
      Number(Boolean(a.suspicious)) - Number(Boolean(b.suspicious)) ||
      a.symbol.localeCompare(b.symbol),
  );
  return out.slice(0, MAX_UNVERIFIED);
}

/** One unverified token the wallet holds, by contract address — the send
 * route's source of truth for balance, decimals and the (sanitized) symbol. */
export async function fetchUnverifiedTokenHolding(
  walletId: string,
  tokenAddress: string,
): Promise<GlideTokenBalance | null> {
  const target = tokenAddress.toLowerCase();
  const initialized = createCircleClient();
  if ("error" in initialized) throw new Error(initialized.error);
  const res = await initialized.client.getWalletTokenBalance({
    id: walletId,
    includeAll: true,
    tokenAddresses: [tokenAddress],
  });
  for (const entry of (res.data?.tokenBalances ?? []) as RawBalance[]) {
    const row = toUnverified(entry);
    if (row?.tokenAddress === target) return row;
  }
  return null;
}

export async function fetchAllWalletTokenBalances(
  walletId: string,
  walletAddress: string,
  options?: { includeOffArc?: boolean },
): Promise<GlideTokenBalance[]> {
  const arc = await fetchWalletTokenBalances(walletId);
  if (options?.includeOffArc === false) return arc;
  try {
    const offArc = await fetchOffArcUsdcBalances(walletAddress);
    return [...arc, ...offArc];
  } catch (err) {
    console.warn("[Glide] off-arc balances skipped:", err);
    return arc;
  }
}

export async function fetchUsdcBalance(walletId: string): Promise<number> {
  return fetchTokenBalance(walletId, "USDC");
}

/** Raw USDC balance on any-chain wallet (returns 0 if no USDC token found).
 * Unlike fetchUsdcBalance which assumes the Arc display set, this reads any
 * supported chain — used by Universal Receive's manual sweep on receive
 * wallets that aren't on Arc. `usdcAddress` is that chain's USDC contract;
 * only that contract counts. */
export async function fetchUsdcBalanceAnyChain(
  walletId: string,
  usdcAddress: string,
): Promise<number> {
  const rows = await fetchTokenRows(walletId, (row) =>
    addressesEqual(row.tokenAddress, usdcAddress) ? "USDC" : null,
  );
  let total = 0;
  for (const row of rows) {
    if (Number.isNaN(row.amount) || row.amount <= 0) continue;
    total += row.amount;
  }
  return total;
}

export async function fetchTokenBalance(
  walletId: string,
  symbol: string,
): Promise<number> {
  const amounts = await fetchVerifiedAmounts(walletId);
  return amounts.get(normalizeTokenSymbol(symbol)) ?? 0;
}

export async function fetchWalletBalance(walletId: string): Promise<number> {
  try {
    return await fetchUsdcBalance(walletId);
  } catch (err) {
    console.error("[Glide] balance:", err);
    throw err instanceof Error ? err : new Error("Could not load balance");
  }
}

export async function fetchWalletById(walletId: string): Promise<GlideWallet | null> {
  const initialized = createCircleClient();
  if ("error" in initialized) return null;

  try {
    const res = await initialized.client.getWallet({ id: walletId });
    const w = res.data?.wallet;
    if (!w?.id || !w?.address) return null;
    return { id: w.id, address: w.address };
  } catch {
    return null;
  }
}

export async function assertSufficientBalance(
  walletId: string,
  amount: number,
  symbol = "USDC",
): Promise<void> {
  const token = normalizeTokenSymbol(symbol);
  const balance = await fetchTokenBalance(walletId, token);
  if (amount > balance) {
    const prefix = isEurcToken(token) ? "€" : "$";
    throw new Error(
      `Insufficient balance. You have ${prefix}${balance.toFixed(2)} ${token} available.`,
    );
  }
}

export { safeApiError };
