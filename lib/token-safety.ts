/** Unverified Arc tokens: anyone can deploy a token with any name and airdrop
 * it to any address. Their symbol and name are attacker-controlled text, so:
 * clean them before display, and flag the ones that pose as a real Circle
 * token or advertise a scam (links, "claim your reward"). Flagged tokens are
 * hidden by default and never offered for sending. Identity is always the
 * contract address, never these strings. */

// Control, zero-width and bidi-override characters (used to disguise text).
const INVISIBLE =
  /[\u0000-\u001f\u007f-\u009f\u00ad\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g;

export function sanitizeTokenText(raw: unknown, max: number): string {
  if (typeof raw !== "string") return "";
  const cleaned = raw
    .normalize("NFKC")
    .replace(INVISIBLE, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length > max ? `${cleaned.slice(0, max - 1)}…` : cleaned;
}

const IMPOSTOR_SYMBOL = /^(USDC|EURC|CIRBTC|USDCE)/;
const IMPOSTOR_NAME = /(USD\s*COIN|EURO\s*COIN|CIRCLE)/i;
const SPAM =
  /(https?:|www\.|\.(com|io|xyz|org|net|app|finance|site|club|top|vip)\b|t\.me|claim|visit|reward|airdrop|bonus|giveaway|redeem|voucher|free\s)/i;

/** True when an unverified token looks like a fake of a real Circle token or
 * like spam. `symbol`/`name` should already be sanitized. */
export function isSuspiciousToken(token: { symbol: string; name: string }): boolean {
  // Non-ASCII symbols are how look-alikes dodge the checks below
  // (e.g. a Cyrillic letter that looks like the S in USDC).
  if (/[^\x20-\x7e]/.test(token.symbol)) return true;
  const symbol = token.symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!symbol) return true;
  if (IMPOSTOR_SYMBOL.test(symbol)) return true;
  if (IMPOSTOR_NAME.test(token.name)) return true;
  return SPAM.test(token.symbol) || SPAM.test(token.name);
}

export const TOKEN_SYMBOL_MAX = 12;
export const TOKEN_NAME_MAX = 32;
