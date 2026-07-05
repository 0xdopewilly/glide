import { transferOnArc } from "@/lib/automation-execute";
import { resolveAutomationDestination } from "@/lib/automations";
import { formatStableAmount } from "@/lib/currency-format";
import { prisma } from "@/lib/db";
import { notifyApprovalRequest, notifyAutomationFailed } from "@/lib/push";
import type { ApprovalPolicy, PendingApproval } from "@prisma/client";

type Token = "USDC" | "EURC" | "cirBTC";

function precision(token: string): number {
  return token === "cirBTC" ? 8 : 2;
}

function asToken(token: string): Token {
  const t = token.toUpperCase();
  return t === "EURC" ? "EURC" : t === "CIRBTC" ? "cirBTC" : "USDC";
}

function normalizeLimit(v?: string | null): string | null {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return null;
  return n.toFixed(2);
}

export async function getApprovalPolicy(
  userId: string,
): Promise<ApprovalPolicy | null> {
  return prisma.approvalPolicy.findUnique({ where: { userId } });
}

export async function upsertApprovalPolicy(
  userId: string,
  input: { autoApproveUnder?: string | null; requireForNewRecipient?: boolean },
): Promise<ApprovalPolicy> {
  const autoApproveUnder = normalizeLimit(input.autoApproveUnder);
  return prisma.approvalPolicy.upsert({
    where: { userId },
    create: {
      userId,
      autoApproveUnder,
      requireForNewRecipient: input.requireForNewRecipient ?? false,
    },
    update: {
      ...(input.autoApproveUnder !== undefined ? { autoApproveUnder } : {}),
      ...(input.requireForNewRecipient !== undefined
        ? { requireForNewRecipient: input.requireForNewRecipient }
        : {}),
    },
  });
}

/** Reason a money-out automation needs approval, or null to auto-approve. */
async function approvalReason(
  userId: string,
  opts: { amount: number; destinationAddress: string; isSavings: boolean },
): Promise<string | null> {
  const policy = await prisma.approvalPolicy.findUnique({ where: { userId } });
  if (!policy) return null; // no policy configured -> auto-approve everything
  if (policy.autoApproveUnder) {
    const limit = parseFloat(policy.autoApproveUnder);
    if (Number.isFinite(limit) && opts.amount > limit) {
      return `Above your $${limit.toFixed(2)} auto-approve limit`;
    }
  }
  if (policy.requireForNewRecipient && !opts.isSavings) {
    const known = await prisma.contact.findFirst({
      where: { userId, walletAddress: opts.destinationAddress },
      select: { id: true },
    });
    if (!known) return "Payment to a new recipient";
  }
  return null;
}

export type GatedResult =
  | { status: "completed"; txId: string | null }
  | { status: "pending_approval"; approvalId: string }
  | { status: "failed"; error: string }
  | { status: "duplicate" };

/** Execute an automated money-out action, gating on the user's approval policy.
 * Claims idempotency and logs an AutomationRun when tied to a rule. Never
 * throws — outcomes are returned and recorded. */
export async function executeGatedAutomation(input: {
  userId: string;
  ruleId?: string;
  mainWalletAddress: string;
  action: string;
  amount: number;
  token: string;
  destination: string;
  sourceRef: string;
  contextLabel?: string;
}): Promise<GatedResult> {
  const token = asToken(input.token);
  const amountLabel = formatStableAmount(input.amount, token);

  let runId: string | null = null;
  if (input.ruleId) {
    try {
      const run = await prisma.automationRun.create({
        data: {
          ruleId: input.ruleId,
          userId: input.userId,
          status: "pending",
          summary: `${amountLabel}…`,
          amountLabel: `−${amountLabel}`,
          sourceRef: input.sourceRef,
        },
      });
      runId = run.id;
    } catch (e) {
      if ((e as { code?: string }).code === "P2002") return { status: "duplicate" };
      console.error("[Glide] gated run claim:", e);
      return { status: "failed", error: "run claim failed" };
    }
  }

  const dest = await resolveAutomationDestination(input.userId, input.destination);
  if (!dest) {
    if (runId) {
      await prisma.automationRun.update({
        where: { id: runId },
        data: {
          status: "failed",
          summary: `Couldn't resolve "${input.destination}"`,
          error: "unresolved destination",
        },
      });
    }
    return { status: "failed", error: "unresolved destination" };
  }

  const reason = await approvalReason(input.userId, {
    amount: input.amount,
    destinationAddress: dest.address,
    isSavings: input.destination === "savings",
  });

  if (reason) {
    const approval = await prisma.pendingApproval.create({
      data: {
        userId: input.userId,
        ruleId: input.ruleId ?? null,
        action: input.action,
        amount: input.amount.toFixed(precision(token)),
        token,
        destination: dest.address,
        recipientLabel: dest.label,
        reason,
        sourceRef: input.sourceRef,
        status: "pending",
      },
    });
    if (runId) {
      await prisma.automationRun.update({
        where: { id: runId },
        data: {
          status: "held",
          summary: `Awaiting approval — send ${amountLabel} to ${dest.label}`,
        },
      });
    }
    try {
      await notifyApprovalRequest(input.userId, amountLabel, dest.label, reason);
    } catch (e) {
      console.error("[Glide] approval notify:", e);
    }
    return { status: "pending_approval", approvalId: approval.id };
  }

  try {
    const txId = await transferOnArc({
      fromAddress: input.mainWalletAddress,
      toAddress: dest.address,
      amount: input.amount.toFixed(precision(token)),
      token,
    });
    if (runId) {
      await prisma.automationRun.update({
        where: { id: runId },
        data: {
          status: "completed",
          summary: `Sent ${amountLabel} to ${dest.label}${input.contextLabel ? ` (${input.contextLabel})` : ""}`,
          resultTxId: txId,
        },
      });
    }
    return { status: "completed", txId };
  } catch (err) {
    const msg = err instanceof Error ? err.message.slice(0, 500) : "transfer failed";
    if (runId) {
      await prisma.automationRun.update({
        where: { id: runId },
        data: {
          status: "failed",
          summary: `Couldn't send ${amountLabel} to ${dest.label}`,
          error: msg,
        },
      });
    }
    try {
      await notifyAutomationFailed(
        input.userId,
        `Couldn't send ${amountLabel} to ${dest.label}.`,
      );
    } catch (e) {
      console.error("[Glide] fail notify:", e);
    }
    return { status: "failed", error: msg };
  }
}

export async function listPendingApprovals(
  userId: string,
): Promise<PendingApproval[]> {
  return prisma.pendingApproval.findMany({
    where: { userId, status: "pending" },
    orderBy: { createdAt: "desc" },
  });
}

/** Approve and execute a held action. Guarded by status so a double-tap can't
 * double-send. */
export async function approvePending(
  userId: string,
  approvalId: string,
): Promise<boolean> {
  const ap = await prisma.pendingApproval.findFirst({
    where: { id: approvalId, userId, status: "pending" },
  });
  if (!ap) return false;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { circleWalletAddress: true },
  });
  if (!user?.circleWalletAddress) {
    await prisma.pendingApproval.update({
      where: { id: ap.id },
      data: { status: "failed", error: "no wallet" },
    });
    return false;
  }

  // Flip to "approving" first so a concurrent approve can't double-execute.
  const claim = await prisma.pendingApproval.updateMany({
    where: { id: ap.id, status: "pending" },
    data: { status: "approved" },
  });
  if (claim.count === 0) return false;

  try {
    const txId = await transferOnArc({
      fromAddress: user.circleWalletAddress,
      toAddress: ap.destination,
      amount: ap.amount,
      token: ap.token,
    });
    await prisma.pendingApproval.update({
      where: { id: ap.id },
      data: { status: "executed", resultTxId: txId },
    });
    if (ap.ruleId && ap.sourceRef) {
      await prisma.automationRun.updateMany({
        where: { ruleId: ap.ruleId, sourceRef: ap.sourceRef },
        data: {
          status: "completed",
          summary: `Approved — sent ${formatStableAmount(parseFloat(ap.amount), asToken(ap.token))} to ${ap.recipientLabel ?? "recipient"}`,
          resultTxId: txId,
        },
      });
    }
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message.slice(0, 500) : "transfer failed";
    await prisma.pendingApproval.update({
      where: { id: ap.id },
      data: { status: "failed", error: msg },
    });
    return false;
  }
}

export async function rejectPending(
  userId: string,
  approvalId: string,
): Promise<boolean> {
  const result = await prisma.pendingApproval.updateMany({
    where: { id: approvalId, userId, status: "pending" },
    data: { status: "rejected" },
  });
  if (result.count > 0) {
    const ap = await prisma.pendingApproval.findFirst({
      where: { id: approvalId, userId },
      select: { ruleId: true, sourceRef: true },
    });
    if (ap?.ruleId && ap.sourceRef) {
      await prisma.automationRun.updateMany({
        where: { ruleId: ap.ruleId, sourceRef: ap.sourceRef },
        data: { status: "failed", summary: "Rejected by you", error: "rejected" },
      });
    }
  }
  return result.count > 0;
}
