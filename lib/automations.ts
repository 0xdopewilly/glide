import { createCircleClient, GLIDE_BLOCKCHAIN } from "@/lib/circle";
import { formatStableAmount } from "@/lib/currency-format";
import { prisma } from "@/lib/db";
import { notifyAutoSave } from "@/lib/push";
import { resolveRecipient } from "@/lib/resolve-recipient";
import { arcTokenAddressForSymbol } from "@/lib/tokens";
import { createGlideWallet, fetchWalletById } from "@/lib/wallet-service";
import type { AutomationRule, AutomationRun } from "@prisma/client";

export type SavingsWallet = { id: string; address: string };

/** MVP rule shape: event-triggered auto-save. Trigger/action are stored as
 * strings so the engine can grow to schedule/threshold triggers later. */
export const SAVE_TRIGGER = "payment_received";
export const SAVE_ACTION = "save";

/** Lazily provision the user's dedicated Savings Circle wallet (an Arc SCA,
 * same as the spending wallet). Idempotent — returns the existing one, and
 * reconciles a half-provisioned row (id present but address missing). */
export async function getOrCreateSavingsWallet(
  userId: string,
): Promise<SavingsWallet> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { savingsWalletId: true, savingsWalletAddress: true },
  });

  if (user?.savingsWalletId && user.savingsWalletAddress) {
    return { id: user.savingsWalletId, address: user.savingsWalletAddress };
  }

  if (user?.savingsWalletId) {
    const fromCircle = await fetchWalletById(user.savingsWalletId);
    if (fromCircle?.address) {
      await prisma.user.update({
        where: { id: userId },
        data: { savingsWalletAddress: fromCircle.address },
      });
      return { id: user.savingsWalletId, address: fromCircle.address };
    }
  }

  const wallet = await createGlideWallet();
  await prisma.user.update({
    where: { id: userId },
    data: {
      savingsWalletId: wallet.id,
      savingsWalletAddress: wallet.address,
    },
  });
  return { id: wallet.id, address: wallet.address };
}

/** Resolve an automation `destination` to an on-chain address + display label.
 * "savings" -> the user's Savings wallet; otherwise a 0x address, @username, or
 * saved contact via resolveRecipient. */
export async function resolveAutomationDestination(
  userId: string,
  destination: string,
): Promise<{ address: string; label: string } | null> {
  if (destination === "savings") {
    const savings = await getOrCreateSavingsWallet(userId);
    return { address: savings.address, label: "Savings" };
  }
  const resolved = await resolveRecipient(userId, destination);
  if (!resolved) return null;
  return { address: resolved.address, label: resolved.label ?? destination };
}

/** Create (or replace) the user's "save N% of every payment" rule. Provisions
 * the Savings wallet first so the rule can actually fire. Only one active
 * save-on-receive rule per (user, token) so percentages never stack. */
export async function createSaveOnReceiveRule(input: {
  userId: string;
  percent: number;
  token?: string;
}): Promise<{ rule: AutomationRule; savings: SavingsWallet }> {
  const percent = Math.round(input.percent);
  if (!Number.isFinite(percent) || percent < 1 || percent > 100) {
    throw new Error("Save percentage must be between 1 and 100.");
  }
  const token = (input.token ?? "USDC").toUpperCase();
  if (token !== "USDC" && token !== "EURC") {
    throw new Error("Auto-save supports USDC or EURC.");
  }

  const savings = await getOrCreateSavingsWallet(input.userId);

  await prisma.automationRule.updateMany({
    where: {
      userId: input.userId,
      trigger: SAVE_TRIGGER,
      action: SAVE_ACTION,
      token,
      active: true,
    },
    data: { active: false },
  });

  const rule = await prisma.automationRule.create({
    data: {
      userId: input.userId,
      name: `Auto-save ${percent}% of every ${token} payment`,
      trigger: SAVE_TRIGGER,
      action: SAVE_ACTION,
      percent,
      token,
      active: true,
    },
  });

  return { rule, savings };
}

export type AutomationsView = {
  rules: AutomationRule[];
  runs: AutomationRun[];
  savingsWalletAddress: string | null;
};

/** Everything the Automation Dashboard needs: rules (active first) + recent
 * run history + the Savings wallet address. */
export async function listAutomations(userId: string): Promise<AutomationsView> {
  const [rules, runs, user] = await Promise.all([
    prisma.automationRule.findMany({
      where: { userId },
      orderBy: [{ active: "desc" }, { createdAt: "desc" }],
    }),
    prisma.automationRun.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { savingsWalletAddress: true },
    }),
  ]);
  return { rules, runs, savingsWalletAddress: user?.savingsWalletAddress ?? null };
}

/** Ownership-scoped activate/deactivate. Returns false if the rule isn't the
 * user's. */
export async function setRuleActive(
  userId: string,
  ruleId: string,
  active: boolean,
): Promise<boolean> {
  const result = await prisma.automationRule.updateMany({
    where: { id: ruleId, userId },
    data: { active },
  });
  return result.count > 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Fire the user's active save-on-receive rules for one incoming payment.
 * Called from the receive/credit path.
 *
 * Safety:
 * - Idempotent per (rule, sourceRef) via the AutomationRun unique index, so
 *   webhook/poll retries never double-save.
 * - Only the MAIN spending wallet's receives trigger a save. The save transfer
 *   is main -> savings; the savings wallet's own credit is never synced through
 *   this path (userOwnsWallet checks circleWalletId), so there is no loop.
 * - Never throws — per-rule failures are recorded as failed runs for the
 *   dashboard. The caller wraps this defensively regardless. */
export async function runSaveRulesForReceive(input: {
  userId: string;
  walletId: string;
  receivedAmount: number;
  token: string;
  sourceRef: string;
}): Promise<void> {
  const token = input.token.toUpperCase();
  if (token !== "USDC" && token !== "EURC") return;
  if (!Number.isFinite(input.receivedAmount) || input.receivedAmount <= 0) {
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { circleWalletId: true, circleWalletAddress: true },
  });
  // Loop guard: only the spending wallet's receives count.
  if (
    !user?.circleWalletId ||
    !user.circleWalletAddress ||
    user.circleWalletId !== input.walletId
  ) {
    return;
  }
  const mainWalletAddress = user.circleWalletAddress;

  const rules = await prisma.automationRule.findMany({
    where: {
      userId: input.userId,
      trigger: SAVE_TRIGGER,
      action: SAVE_ACTION,
      token,
      active: true,
    },
  });

  for (const rule of rules) {
    if (!rule.percent || rule.percent < 1) continue;
    const amount = round2((input.receivedAmount * rule.percent) / 100);
    if (amount <= 0) continue;

    // Claim idempotency first: one run per (rule, sourceRef).
    let runId: string;
    try {
      const run = await prisma.automationRun.create({
        data: {
          ruleId: rule.id,
          userId: input.userId,
          status: "pending",
          summary: `Auto-saving ${formatStableAmount(amount, token)}…`,
          amountLabel: `+${formatStableAmount(amount, token)}`,
          sourceRef: input.sourceRef,
        },
      });
      runId = run.id;
    } catch (e) {
      if ((e as { code?: string }).code === "P2002") continue; // already saved
      console.error("[Glide] auto-save run claim:", e);
      continue;
    }

    try {
      const savings = await getOrCreateSavingsWallet(input.userId);
      const initialized = createCircleClient();
      if ("error" in initialized) throw new Error(initialized.error);

      const res = await initialized.client.createTransaction({
        walletAddress: mainWalletAddress,
        blockchain: GLIDE_BLOCKCHAIN,
        tokenAddress: arcTokenAddressForSymbol(token),
        destinationAddress: savings.address,
        amount: [amount.toFixed(2)],
        fee: { type: "level", config: { feeLevel: "MEDIUM" } },
      });

      await prisma.automationRun.update({
        where: { id: runId },
        data: {
          status: "completed",
          summary: `Saved ${formatStableAmount(amount, token)} (${rule.percent}%) from a ${formatStableAmount(input.receivedAmount, token)} payment`,
          resultTxId: res.data?.id ?? null,
        },
      });

      try {
        await notifyAutoSave(
          input.userId,
          formatStableAmount(amount, token),
          formatStableAmount(input.receivedAmount, token),
          rule.percent,
        );
      } catch (err) {
        console.error("[Glide] auto-save notify:", err);
      }
    } catch (err) {
      await prisma.automationRun.update({
        where: { id: runId },
        data: {
          status: "failed",
          summary: `Couldn't auto-save from a ${formatStableAmount(input.receivedAmount, token)} payment`,
          error:
            err instanceof Error ? err.message.slice(0, 500) : "unknown error",
        },
      });
    }
  }
}
