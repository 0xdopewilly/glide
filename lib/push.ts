import { formatStableAmount } from "@/lib/currency-format";
import { prisma } from "@/lib/db";
import { createNotification, type NotificationType } from "@/lib/notifications";
import {
  formatAmountForPush,
  formatUserForPush,
  formatUsernameForPush,
} from "@/lib/push-display";
import webpush from "web-push";

export function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim() || "mailto:support@glide.app";

  if (!publicKey || !privateKey) {
    return false;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

/** Sends to every device the user enabled alerts on. Returns how many
 * deliveries the push services accepted. Subscriptions the push service
 * reports gone (404/410: app uninstalled, alerts revoked) are deleted so
 * they stop failing on every payment. */
export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string },
): Promise<{ sent: number; devices: number }> {
  if (!configureWebPush()) return { sent: 0, devices: 0 };

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) return { sent: 0, devices: 0 };

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/notifications",
  });

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        body,
        { TTL: 24 * 60 * 60, urgency: "high" },
      ),
    ),
  );

  const gone: string[] = [];
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      const code = (r.reason as { statusCode?: number })?.statusCode;
      if (code === 404 || code === 410) gone.push(subs[i].id);
      else console.warn("[Glide] push delivery failed:", code ?? r.reason);
    }
  });
  if (gone.length) {
    await prisma.pushSubscription
      .deleteMany({ where: { id: { in: gone } } })
      .catch((err) => console.warn("[Glide] push cleanup:", err));
  }
  return {
    sent: results.filter((r) => r.status === "fulfilled").length,
    devices: subs.length,
  };
}

async function notifyUser(
  userId: string,
  input: {
    type: NotificationType;
    title: string;
    body: string;
    url?: string;
    metadata?: Record<string, unknown>;
  },
) {
  await createNotification({
    userId,
    type: input.type,
    title: input.title,
    body: input.body,
    url: input.url,
    metadata: input.metadata,
  });

  await sendPushToUser(userId, {
    title: input.title,
    body: input.body,
    url: input.url ?? "/notifications",
  });
}

export async function notifyIncomingPayment(
  userId: string,
  amountLabel: string,
  transactionId: string,
  fromWalletAddress?: string | null,
  token?: string | null,
) {
  const amount = formatAmountForPush(amountLabel, token);
  const from = await formatUserForPush(fromWalletAddress);

  await notifyUser(userId, {
    type: "payment_received",
    title: "Money received",
    body: `You received ${amount} from ${from}.`,
    url: "/activity",
    metadata: { transactionId, from },
  });

  await prisma.transaction.update({
    where: { id: transactionId },
    data: { pushNotified: true },
  });
}

export async function notifySwapComplete(
  userId: string,
  amount: string,
  tokenIn = "USDC",
  tokenOut = "EURC",
) {
  const parsed = formatStableAmount(amount, tokenIn);

  await notifyUser(userId, {
    type: "swap_complete",
    title: "Swap complete",
    body: `You swapped ${parsed} to ${tokenOut}.`,
    url: "/activity",
    metadata: { amount, tokenIn, tokenOut },
  });
}

/** Notify a user that an auto-save rule ran — push + in-app inbox. Amount
 * labels are already formatted (e.g. "$10.00"). */
/** Sent once the auto-save transfer has settled on-chain (not on submit).
 * `summary` is the run's settled summary, e.g. "Saved $10.00 (10%) from a
 * $100.00 payment". */
export async function notifyAutoSave(userId: string, summary: string) {
  await notifyUser(userId, {
    type: "automation_saved",
    title: "Auto-saved to Savings",
    body: `${summary}.`,
    url: "/automations",
  });
}

/** An automation is waiting for the user's approval before it executes. */
export async function notifyApprovalRequest(
  userId: string,
  amountLabel: string,
  toLabel: string,
  reason: string,
) {
  await notifyUser(userId, {
    type: "approval_required",
    title: "Approval needed",
    body: `An automation wants to send ${amountLabel} to ${toLabel}. ${reason}. Tap to review.`,
    url: "/automations",
  });
}

/** An automation tried to run but failed. */
export async function notifyAutomationFailed(
  userId: string,
  what: string,
) {
  await notifyUser(userId, {
    type: "automation_failed",
    title: "Automation didn't run",
    body: `${what} Check your Automations for details.`,
    url: "/automations",
  });
}

export async function notifyPaymentRequest(
  targetUserId: string,
  amount: string,
  fromLabel: string,
  payUrl: string,
  token = "USDC",
) {
  const parsed = formatAmountForPush(`$${amount}`, token);
  const from = formatUsernameForPush(fromLabel);
  const url = payUrl.startsWith("/") ? payUrl : `/pay/${payUrl}`;

  await notifyUser(targetUserId, {
    type: "payment_request",
    title: "Payment request",
    body: `${from} requested ${parsed}.`,
    url,
    metadata: { amount, from },
  });
}

export async function notifyRequestPaid(
  requesterUserId: string,
  amount: string,
  payerLabel: string,
  token = "USDC",
) {
  const parsed = formatStableAmount(amount, token);
  const from = formatUsernameForPush(payerLabel);

  await notifyUser(requesterUserId, {
    type: "request_paid",
    title: "Request paid",
    body: `${from} paid your ${parsed} request.`,
    url: "/activity",
    metadata: { amount, from },
  });
}

/** Single push for Universal Receive — fired exactly once per cross-chain
 * inbound transfer, after the CCTP sweep lands on Arc. The Arc-side "incoming"
 * is suppressed by webhook routing (the receive shows up only as this notify). */
export async function notifyIncomingFromChain(
  userId: string,
  input: { amount: string; chainLabel: string; transactionId: string },
) {
  const parsed = formatAmountForPush(`$${input.amount}`, "USDC");

  await notifyUser(userId, {
    type: "payment_received",
    title: "Money received",
    body: `You received ${parsed} via ${input.chainLabel}.`,
    url: "/activity",
    metadata: {
      transactionId: input.transactionId,
      originChain: input.chainLabel,
    },
  });

  await prisma.transaction.update({
    where: { id: input.transactionId },
    data: { pushNotified: true },
  });
}

export async function notifyBridgeComplete(
  userId: string,
  amount: string,
  networkLabel: string,
) {
  const parsed = formatAmountForPush(`$${amount}`);

  await notifyUser(userId, {
    type: "bridge_complete",
    title: "Bridge complete",
    body: `You bridged ${parsed} to ${networkLabel}.`,
    url: "/activity",
    metadata: { amount, network: networkLabel },
  });
}
