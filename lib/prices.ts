/** USD prices for the verified non-dollar tokens (EURC, cirBTC), server side.
 * USDC is always $1. Unverified tokens are never priced.
 *
 * CoinGecko first, Coinbase as a fallback; cached per instance for a minute
 * and served stale for up to an hour if both are down. A price outside a
 * sane band is rejected, so a bad feed can't inflate anyone's balance. If
 * there is no price, callers show the amount without a dollar value. */

export type PricedToken = "EURC" | "cirBTC";
export type TokenPrices = Record<PricedToken, number | null>;

const FRESH_MS = 60_000;
const STALE_MS = 60 * 60_000;
const TIMEOUT_MS = 2_500;
const COLD_WAIT_MS = 1_200;

const SANE: Record<PricedToken, [number, number]> = {
  EURC: [0.5, 2],
  cirBTC: [1_000, 10_000_000],
};

export function sanePrice(token: PricedToken, value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  const [lo, hi] = SANE[token];
  return n >= lo && n <= hi ? n : null;
}

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

export function parseCoinGecko(data: unknown): TokenPrices {
  const d = (data ?? {}) as Record<string, { usd?: unknown } | undefined>;
  return {
    EURC: sanePrice("EURC", d["euro-coin"]?.usd),
    cirBTC: sanePrice("cirBTC", d.bitcoin?.usd),
  };
}

/** Coinbase's rates are units per 1 USD, so the USD price is the inverse. */
export function parseCoinbaseRates(data: unknown): TokenPrices {
  const rates = ((data as { data?: { rates?: Record<string, unknown> } })?.data
    ?.rates ?? {}) as Record<string, unknown>;
  const inverse = (k: string) => {
    const n = Number(rates[k]);
    return Number.isFinite(n) && n > 0 ? 1 / n : null;
  };
  return {
    EURC: sanePrice("EURC", inverse("EURC") ?? inverse("EUR")),
    cirBTC: sanePrice("cirBTC", inverse("BTC")),
  };
}

async function fetchFresh(): Promise<TokenPrices> {
  let prices: TokenPrices = { EURC: null, cirBTC: null };
  try {
    prices = parseCoinGecko(
      await getJson(
        "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,euro-coin&vs_currencies=usd",
      ),
    );
  } catch (err) {
    console.warn("[Glide] prices (coingecko):", err);
  }
  if (prices.EURC === null || prices.cirBTC === null) {
    try {
      const cb = parseCoinbaseRates(
        await getJson("https://api.coinbase.com/v2/exchange-rates?currency=USD"),
      );
      prices = {
        EURC: prices.EURC ?? cb.EURC,
        cirBTC: prices.cirBTC ?? cb.cirBTC,
      };
    } catch (err) {
      console.warn("[Glide] prices (coinbase):", err);
    }
  }
  return prices;
}

const TOKENS: PricedToken[] = ["EURC", "cirBTC"];
const cache: Record<PricedToken, { price: number; at: number } | null> = {
  EURC: null,
  cirBTC: null,
};
let lastFetchAt = 0;
let inflight: Promise<void> | null = null;

/** Starts a feed refresh if the last one is over a minute old. */
function refresh(): Promise<void> {
  if (!inflight && Date.now() - lastFetchAt >= FRESH_MS) {
    inflight = fetchFresh()
      .then((fresh) => {
        const at = Date.now();
        for (const k of TOKENS) {
          const price = fresh[k];
          if (price !== null) cache[k] = { price, at };
        }
      })
      .finally(() => {
        // Advances on failure too: at most one round-trip a minute.
        lastFetchAt = Date.now();
        inflight = null;
      });
  }
  return inflight ?? Promise.resolve();
}

function snapshot(): TokenPrices {
  const now = Date.now();
  const out = {} as TokenPrices;
  for (const k of TOKENS) {
    const entry = cache[k];
    out[k] = entry && now - entry.at < STALE_MS ? entry.price : null;
  }
  return out;
}

/** Never blocks the wallet load on a slow feed: answers from cache and
 * refreshes in the background; only a cold instance waits, briefly. */
export async function getTokenPrices(): Promise<TokenPrices> {
  const cached = snapshot();
  const pending = refresh();
  if (cached.EURC === null && cached.cirBTC === null) {
    await Promise.race([
      pending,
      new Promise((resolve) => setTimeout(resolve, COLD_WAIT_MS)),
    ]);
    return snapshot();
  }
  return cached;
}
