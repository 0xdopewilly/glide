import { createCircleClient, GLIDE_BLOCKCHAIN } from "@/lib/circle";
import { arcTokenAddressForSymbol } from "@/lib/tokens";

/** Raw Circle transfer on Arc from a wallet address to a destination address.
 * Shared by every automation execution path (auto-save, scheduled sends,
 * threshold sweeps, approved actions). Returns the Circle transaction id.
 * Kept dependency-light (circle + tokens only) so higher-level automation
 * modules can import it without cycles. */
export async function transferOnArc(input: {
  fromAddress: string;
  toAddress: string;
  amount: string; // formatted, e.g. "10.00"
  token: string; // USDC | EURC | cirBTC
}): Promise<string | null> {
  const initialized = createCircleClient();
  if ("error" in initialized) throw new Error(initialized.error);

  const res = await initialized.client.createTransaction({
    walletAddress: input.fromAddress,
    blockchain: GLIDE_BLOCKCHAIN,
    tokenAddress: arcTokenAddressForSymbol(input.token),
    destinationAddress: input.toAddress,
    amount: [input.amount],
    fee: { type: "level", config: { feeLevel: "MEDIUM" } },
  });
  return res.data?.id ?? null;
}
