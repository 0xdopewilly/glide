import { executeGatedAutomation } from "@/lib/approvals";
import {
  SAVE_ACTION,
  SCHEDULE_TRIGGER,
  SEND_ACTION,
  THRESHOLD_TRIGGER,
} from "@/lib/automations";
import { prisma } from "@/lib/db";
import { advanceNextRun, isScheduleFrequency } from "@/lib/scheduled-transfers";
import { fetchTokenBalance } from "@/lib/wallet-service";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Fire schedule rules whose nextRunAt has passed, then advance them.
 * Idempotent per occurrence (sourceRef = rule + scheduled time). */
export async function runDueScheduleRules(
  limit = 50,
): Promise<{ id: string; status: string }[]> {
  const now = new Date();
  const due = await prisma.automationRule.findMany({
    where: {
      trigger: SCHEDULE_TRIGGER,
      action: SEND_ACTION,
      active: true,
      nextRunAt: { lte: now },
    },
    take: limit,
  });

  const results: { id: string; status: string }[] = [];
  for (const rule of due) {
    if (!rule.amount || !rule.destination) continue;
    const user = await prisma.user.findUnique({
      where: { id: rule.userId },
      select: { circleWalletAddress: true },
    });
    if (!user?.circleWalletAddress) {
      results.push({ id: rule.id, status: "no_wallet" });
      continue;
    }
    const occurrence = (rule.nextRunAt ?? now).toISOString();
    const res = await executeGatedAutomation({
      userId: rule.userId,
      ruleId: rule.id,
      mainWalletAddress: user.circleWalletAddress,
      action: "send",
      amount: Number(rule.amount),
      token: rule.token,
      destination: rule.destination,
      sourceRef: `sched:${rule.id}:${occurrence}`,
      contextLabel: rule.frequency ?? undefined,
    });
    const freq =
      rule.frequency && isScheduleFrequency(rule.frequency)
        ? rule.frequency
        : "monthly";
    // Advance to the next FUTURE occurrence. If the cron was delayed and missed
    // periods, skip them rather than firing a burst of catch-up sends — we sent
    // once above; the rest are intentionally not back-paid.
    let next = advanceNextRun(rule.nextRunAt ?? now, freq);
    for (let i = 0; i < 10000 && next.getTime() <= now.getTime(); i++) {
      next = advanceNextRun(next, freq);
    }
    await prisma.automationRule.update({
      where: { id: rule.id },
      data: { nextRunAt: next, lastRunAt: now },
    });
    results.push({ id: rule.id, status: res.status });
  }
  return results;
}

/** Evaluate threshold rules: if the spending balance exceeds the ceiling,
 * sweep the excess into Savings. Idempotent per (rule, day). */
export async function runThresholdSweeps(
  limit = 50,
): Promise<{ id: string; status: string; excess?: number }[]> {
  const rules = await prisma.automationRule.findMany({
    where: { trigger: THRESHOLD_TRIGGER, action: SAVE_ACTION, active: true },
    take: limit,
  });

  const dayKey = new Date().toISOString().slice(0, 10);
  const results: { id: string; status: string; excess?: number }[] = [];
  for (const rule of rules) {
    if (!rule.thresholdAmount) continue;
    const user = await prisma.user.findUnique({
      where: { id: rule.userId },
      select: { circleWalletId: true, circleWalletAddress: true },
    });
    if (!user?.circleWalletId || !user.circleWalletAddress) {
      results.push({ id: rule.id, status: "no_wallet" });
      continue;
    }
    let balance = 0;
    try {
      balance = await fetchTokenBalance(user.circleWalletId, rule.token);
    } catch {
      results.push({ id: rule.id, status: "balance_error" });
      continue;
    }
    const excess = round2(balance - Number(rule.thresholdAmount));
    if (excess <= 0) {
      results.push({ id: rule.id, status: "under_threshold" });
      continue;
    }
    const res = await executeGatedAutomation({
      userId: rule.userId,
      ruleId: rule.id,
      mainWalletAddress: user.circleWalletAddress,
      action: "save",
      amount: excess,
      token: rule.token,
      destination: "savings",
      sourceRef: `thresh:${rule.id}:${dayKey}`,
      contextLabel: "balance sweep",
    });
    await prisma.automationRule.update({
      where: { id: rule.id },
      data: { lastRunAt: new Date() },
    });
    results.push({ id: rule.id, status: res.status, excess });
  }
  return results;
}
