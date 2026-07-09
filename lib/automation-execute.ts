import crypto from "node:crypto";
import { createCircleClient, GLIDE_BLOCKCHAIN } from "@/lib/circle";
import { arcTokenAddressForSymbol } from "@/lib/tokens";

/** Deterministic RFC-4122-shaped UUID from an arbitrary seed. Passed to Circle's
 * createTransaction as the idempotencyKey, it makes a given automation
 * occurrence dedupe at the Circle layer — so a retry, or a re-run after a
 * partial failure (transfer sent but the follow-up DB write failed), can never
 * double-send. Same seed → same key. */
export function stableIdempotencyKey(seed: string): string {
  const hex = crypto
    .createHash("sha256")
    .update(seed)
    .digest("hex")
    .slice(0, 32);
  const c = hex.split("");
  c[12] = "4"; // version 4
  c[16] = ((parseInt(c[16], 16) & 0x3) | 0x8).toString(16); // variant 8–b
  const s = c.join("");
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20, 32)}`;
}

/** Raw Circle transfer on Arc from a wallet address to a destination address.
 * Shared by every automation execution path (auto-save, scheduled sends,
 * threshold sweeps, approved actions). Returns the Circle transaction id.
 * Kept dependency-light (circle + tokens only) so higher-level automation
 * modules can import it without cycles.
 *
 * Pass a stable `idempotencyKey` (see stableIdempotencyKey) to make retries
 * safe: with one, Circle dedupes, so a transient failure is retried with
 * backoff. Without one, the SDK generates a fresh key per call, so we do NOT
 * retry — a second attempt could send twice. */
export async function transferOnArc(input: {
  fromAddress: string;
  toAddress: string;
  amount: string; // formatted, e.g. "10.00"
  token: string; // USDC | EURC | cirBTC
  idempotencyKey?: string;
}): Promise<string | null> {
  const initialized = createCircleClient();
  if ("error" in initialized) throw new Error(initialized.error);

  const key = input.idempotencyKey;
  const run = () =>
    initialized.client.createTransaction({
      walletAddress: input.fromAddress,
      blockchain: GLIDE_BLOCKCHAIN,
      tokenAddress: arcTokenAddressForSymbol(input.token),
      destinationAddress: input.toAddress,
      amount: [input.amount],
      fee: { type: "level", config: { feeLevel: "MEDIUM" } },
      ...(key ? { idempotencyKey: key } : {}),
    });

  const maxAttempts = key ? 3 : 1;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await run();
      return res.data?.id ?? null;
    } catch (err) {
      lastErr = err;
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 400 * attempt));
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("transfer failed");
}
