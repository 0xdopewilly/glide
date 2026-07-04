import { prisma } from "@/lib/db";
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
