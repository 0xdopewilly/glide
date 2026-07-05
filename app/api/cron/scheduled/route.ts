import { runDueScheduleRules, runThresholdSweeps } from "@/lib/automation-cron";
import { createCircleClient, GLIDE_BLOCKCHAIN, safeApiError } from "@/lib/circle";
import { ARC_USDC_TOKEN_ADDRESS } from "@/lib/tokens";
import { resolveRecipient } from "@/lib/resolve-recipient";
import { recordTransaction } from "@/lib/transactions-db";
import {
  advanceNextRun,
  dueScheduledTransfers,
  type ScheduleFrequency,
} from "@/lib/scheduled-transfers";
import { prisma } from "@/lib/db";
import {
  assertSufficientBalance,
  fetchWalletById,
} from "@/lib/wallet-service";
import { formatResolvedRecipientLabel } from "@/lib/resolve-recipient";
import { arcExplorerUrl } from "@/lib/transactions-db";
import { NextRequest, NextResponse } from "next/server";

/** GET - run due scheduled sends (protect with CRON_SECRET) */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const due = await dueScheduledTransfers(15);
  const results: { id: string; ok: boolean; error?: string }[] = [];

  for (const job of due) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: job.userId },
        select: { circleWalletId: true },
      });
      if (!user?.circleWalletId) {
        results.push({ id: job.id, ok: false, error: "no wallet" });
        continue;
      }

      const resolved = await resolveRecipient(job.userId, job.destination);
      if (!resolved) {
        results.push({ id: job.id, ok: false, error: "bad recipient" });
        continue;
      }

      const amount = parseFloat(job.amount);
      const initialized = createCircleClient();
      if ("error" in initialized) throw new Error(initialized.error);

      const wallet = await fetchWalletById(user.circleWalletId);
      if (!wallet) throw new Error("wallet missing");

      await assertSufficientBalance(user.circleWalletId, amount);

      const res = await initialized.client.createTransaction({
        walletAddress: wallet.address,
        blockchain: GLIDE_BLOCKCHAIN,
        tokenAddress: ARC_USDC_TOKEN_ADDRESS,
        destinationAddress: resolved.address,
        amount: [amount.toFixed(2)],
        fee: { type: "level", config: { feeLevel: "MEDIUM" } },
      });

      const circleId = res.data?.id;
      const txHash = (res.data as { txHash?: string } | undefined)?.txHash;

      await recordTransaction({
        userId: job.userId,
        kind: "send",
        title: `Scheduled to ${formatResolvedRecipientLabel(resolved)}`,
        amountLabel: `−$${amount.toFixed(2)}`,
        variant: "debit",
        status: res.data?.state,
        circleTransactionId: circleId,
        txHash,
        explorerUrl: txHash ? arcExplorerUrl(txHash) : undefined,
        chain: GLIDE_BLOCKCHAIN,
        metadata: job.note ? { note: job.note, scheduledId: job.id } : { scheduledId: job.id },
      });

      await prisma.scheduledTransfer.update({
        where: { id: job.id },
        data: {
          nextRunAt: advanceNextRun(job.nextRunAt, job.frequency as ScheduleFrequency),
        },
      });

      results.push({ id: job.id, ok: true });
    } catch (err) {
      results.push({
        id: job.id,
        ok: false,
        error: safeApiError(err),
      });
    }
  }

  // Automation Rules Engine: schedule sends + threshold sweeps. Wrapped so a
  // failure here can't break the legacy scheduled-transfer processing above.
  let scheduleRules: unknown = [];
  let thresholdSweeps: unknown = [];
  try {
    scheduleRules = await runDueScheduleRules();
  } catch (err) {
    console.error("[Glide] schedule-rules cron:", err);
  }
  try {
    thresholdSweeps = await runThresholdSweeps();
  } catch (err) {
    console.error("[Glide] threshold-sweeps cron:", err);
  }

  return NextResponse.json({
    processed: results.length,
    results,
    scheduleRules,
    thresholdSweeps,
  });
}
