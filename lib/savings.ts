import { transferOnArc } from "@/lib/automation-execute";
import { prisma } from "@/lib/db";
import { fetchTokenBalance } from "@/lib/wallet-service";

export type SavingsSummary = {
  /** null until the Savings wallet is provisioned (on first auto-save rule). */
  address: string | null;
  usdc: number;
  eurc: number;
};

export async function getSavingsSummary(userId: string): Promise<SavingsSummary> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { savingsWalletId: true, savingsWalletAddress: true },
  });
  if (!u?.savingsWalletId || !u.savingsWalletAddress) {
    return { address: null, usdc: 0, eurc: 0 };
  }
  const [usdc, eurc] = await Promise.all([
    fetchTokenBalance(u.savingsWalletId, "USDC").catch(() => 0),
    fetchTokenBalance(u.savingsWalletId, "EURC").catch(() => 0),
  ]);
  return {
    address: u.savingsWalletAddress,
    usdc: Math.round(usdc * 100) / 100,
    eurc: Math.round(eurc * 100) / 100,
  };
}

/** Move funds from Savings back to the spending wallet. Both are the user's own
 * Circle DCW wallets, so this is a server-signed internal transfer — no PIN
 * (nothing leaves the user's control; sending externally still needs the PIN). */
export async function withdrawFromSavings(
  userId: string,
  input: { amount: string; token?: string },
): Promise<{ ok: boolean; error?: string }> {
  const token = (input.token ?? "USDC").toUpperCase() === "EURC" ? "EURC" : "USDC";
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Enter an amount greater than 0." };
  }

  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      savingsWalletId: true,
      savingsWalletAddress: true,
      circleWalletAddress: true,
    },
  });
  if (!u?.savingsWalletId || !u.savingsWalletAddress) {
    return { ok: false, error: "You don't have any Savings yet." };
  }
  if (!u.circleWalletAddress) {
    return { ok: false, error: "Your spending wallet isn't ready." };
  }

  let balance = 0;
  try {
    balance = await fetchTokenBalance(u.savingsWalletId, token);
  } catch {
    return { ok: false, error: "Couldn't read your Savings balance." };
  }
  if (amount > balance + 1e-9) {
    return {
      ok: false,
      error: `You only have ${balance.toFixed(2)} ${token} in Savings.`,
    };
  }

  try {
    await transferOnArc({
      fromAddress: u.savingsWalletAddress,
      toAddress: u.circleWalletAddress,
      amount: amount.toFixed(2),
      token,
    });
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message.slice(0, 300) : "Withdrawal failed.",
    };
  }
}
