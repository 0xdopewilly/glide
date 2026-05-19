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

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string },
) {
  if (!configureWebPush()) return;

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) return;

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/notifications",
  });

  await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        body,
      ),
    ),
  );
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
) {
  const amount = formatAmountForPush(amountLabel);
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

export async function notifyPaymentSent(
  userId: string,
  amount: string,
  toLabel: string,
  token: "USDC" | "EURC" = "USDC",
) {
  const prefix = token === "EURC" ? "€" : "$";
  const parsed = formatAmountForPush(`${prefix}${amount}`);
  const target = formatUsernameForPush(toLabel);

  await notifyUser(userId, {
    type: "payment_sent",
    title: "Payment sent",
    body: `You sent ${parsed} to ${target}.`,
    url: "/activity",
    metadata: { amount, to: target, token },
  });
}

export async function notifySwapComplete(userId: string, amount: string) {
  const parsed = formatAmountForPush(`$${amount}`);

  await notifyUser(userId, {
    type: "swap_complete",
    title: "Swap complete",
    body: `You swapped ${parsed} to EURC.`,
    url: "/activity",
    metadata: { amount },
  });
}

export async function notifyPaymentRequest(
  targetUserId: string,
  amount: string,
  fromLabel: string,
  payUrl: string,
) {
  const parsed = formatAmountForPush(`$${amount}`);
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
) {
  const parsed = formatAmountForPush(`$${amount}`);
  const from = formatUsernameForPush(payerLabel);

  await notifyUser(requesterUserId, {
    type: "request_paid",
    title: "Request paid",
    body: `${from} paid your ${parsed} request.`,
    url: "/activity",
    metadata: { amount, from },
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
