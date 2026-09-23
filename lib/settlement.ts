// Settlement reconciler: money movements are recorded when Circle ACCEPTS a
// transfer ("submitted" / "processing"); this moves them to their final
// state only once Circle reports it settled, and sends the success push then.
//
//   AutomationRun   submitted  -> completed | failed
//   PendingApproval submitted  -> executed  | failed
//   PaymentRequest  processing -> paid      | pending (reopened)
//
// Every transition is a conditional updateMany on the "in-flight" status, so
// concurrent reconcilers (poll + cron + after()) can't notify twice. Stuck
// CCTP bridges are resumed separately (lib/bridge-resume.ts).
import { createCircleClient } from "@/lib/circle";
import { prisma } from "@/lib/db";
import {
  notifyAutoSave,
  notifyAutomationFailed,
  notifyRequestPaid,
} from "@/lib/push";

type Outcome = "settled" | "failed" | "pending";

/** Circle DCW transaction state -> our outcome. COMPLETE is final; FAILED,
 * DENIED and CANCELLED are terminal failures; everything else (INITIATED,
 * CLEARED, QUEUED, SENT, CONFIRMED, STUCK) is still in flight. */
export function settlementOutcome(state: string | undefined): Outcome {
  if (state === "COMPLETE") return "settled";
  if (state === "FAILED" || state === "DENIED" || state === "CANCELLED") {
    return "failed";
  }
  return "pending";
}

/** "Saving $10…" -> "Saved $10…", "Sending"/"sending" -> "Sent"/"sent". */
export function settledSummary(summary: string): string {
  return summary
    .replace(/^Saving\b/, "Saved")
    .replace(/^Sending\b/, "Sent")
    .replace(/\bsending\b/, "sent");
}

async function circleState(txId: string): Promise<string | undefined> {
  const initialized = createCircleClient();
  if ("error" in initialized) return undefined;
  try {
    const res = await initialized.client.getTransaction({ id: txId });
    return res.data?.transaction?.state;
  } catch (err) {
    console.warn("[Glide] settlement state:", err);
    return undefined;
  }
}

/** Only check items older than this, so a transfer submitted a moment ago
 * isn't polled before Circle can possibly have settled it. */
const MIN_AGE_MS = 2_000;
const BATCH = 25;

async function reconcileRuns(userId?: string) {
  // AutomationRun has no updatedAt; runs are submitted right after creation.
  const runs = await prisma.automationRun.findMany({
    where: {
      status: "submitted",
      resultTxId: { not: null },
      createdAt: { lte: new Date(Date.now() - MIN_AGE_MS) },
      ...(userId ? { userId } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: BATCH,
    include: { rule: { select: { trigger: true } } },
  });

  await Promise.all(
    runs.map(async (run) => {
      const outcome = settlementOutcome(await circleState(run.resultTxId!));
      if (outcome === "pending") return;
      if (outcome === "settled") {
        const summary = settledSummary(run.summary);
        const moved = await prisma.automationRun.updateMany({
          where: { id: run.id, status: "submitted" },
          data: { status: "completed", summary },
        });
        // Auto-save is the one automation that announces success.
        if (moved.count > 0 && run.rule.trigger === "payment_received") {
          await notifyAutoSave(run.userId, summary).catch((err) =>
            console.error("[Glide] auto-save notify:", err),
          );
        }
        return;
      }
      const moved = await prisma.automationRun.updateMany({
        where: { id: run.id, status: "submitted" },
        data: {
          status: "failed",
          error: "Transfer failed on the network",
          summary: `Couldn't complete: ${settledSummary(run.summary)}`,
        },
      });
      if (moved.count > 0) {
        await notifyAutomationFailed(
          run.userId,
          `An automation (${run.amountLabel ?? "transfer"}) didn't go through.`,
        ).catch((err) => console.error("[Glide] fail notify:", err));
      }
    }),
  );
}

async function reconcileApprovals(userId?: string) {
  const approvals = await prisma.pendingApproval.findMany({
    where: {
      status: "submitted",
      resultTxId: { not: null },
      updatedAt: { lte: new Date(Date.now() - MIN_AGE_MS) },
      ...(userId ? { userId } : {}),
    },
    orderBy: { updatedAt: "asc" },
    take: BATCH,
  });

  await Promise.all(
    approvals.map(async (ap) => {
      const outcome = settlementOutcome(await circleState(ap.resultTxId!));
      if (outcome === "pending") return;
      await prisma.pendingApproval.updateMany({
        where: { id: ap.id, status: "submitted" },
        data:
          outcome === "settled"
            ? { status: "executed" }
            : { status: "failed", error: "Transfer failed on the network" },
      });
      // The linked AutomationRun (same resultTxId) settles in reconcileRuns.
    }),
  );
}

async function reconcileRequests(userId?: string) {
  // userId scopes to requests this user PAID (their send settles them).
  const requests = await prisma.paymentRequest.findMany({
    where: {
      status: "processing",
      updatedAt: { lte: new Date(Date.now() - MIN_AGE_MS) },
      ...(userId ? { paidByUserId: userId } : {}),
    },
    orderBy: { updatedAt: "asc" },
    take: BATCH,
  });

  await Promise.all(
    requests.map(async (req) => {
      if (!req.paidByUserId) return;
      // /api/send tags the payer's row with the request code.
      const send = await prisma.transaction.findFirst({
        where: {
          userId: req.paidByUserId,
          kind: "send",
          metadata: { path: ["requestCode"], equals: req.code },
        },
        orderBy: { createdAt: "desc" },
        select: { circleTransactionId: true },
      });
      if (!send?.circleTransactionId) return;

      const outcome = settlementOutcome(await circleState(send.circleTransactionId));
      if (outcome === "pending") return;

      if (outcome === "failed") {
        // The payment never happened: reopen so it can be paid.
        await prisma.paymentRequest.updateMany({
          where: { id: req.id, status: "processing" },
          data: { status: "pending", paidByUserId: null },
        });
        return;
      }

      const moved = await prisma.paymentRequest.updateMany({
        where: { id: req.id, status: "processing" },
        data: { status: "paid" },
      });
      if (moved.count > 0 && req.paidByUserId !== req.userId) {
        const payer = await prisma.user.findUnique({
          where: { id: req.paidByUserId },
          select: { username: true, displayName: true },
        });
        const payerLabel = payer?.username ?? payer?.displayName ?? "Someone";
        await notifyRequestPaid(
          req.userId,
          req.amount,
          payerLabel,
          req.token,
        ).catch((err) => console.error("[Glide] request paid notify:", err));
      }
    }),
  );
}

/** Settle everything in flight (for one user, or everyone from the cron).
 * Never throws — reconciliation must not break the request that runs it. */
export async function reconcileSettlements(userId?: string): Promise<void> {
  const parts = await Promise.allSettled([
    reconcileRuns(userId),
    reconcileApprovals(userId),
    reconcileRequests(userId),
  ]);
  for (const p of parts) {
    if (p.status === "rejected") console.error("[Glide] settlement:", p.reason);
  }
}

/** For after(): Arc settles in seconds, so give Circle a moment, then
 * reconcile — the user sees "done" right away instead of on the next poll. */
export async function settleSoon(userId: string, delayMs = 4_000): Promise<void> {
  await new Promise((r) => setTimeout(r, delayMs));
  await reconcileSettlements(userId);
}
