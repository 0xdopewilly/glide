import { prisma } from "@/lib/db";
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
    url: payload.url ?? "/activity",
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

export async function notifyIncomingPayment(
  userId: string,
  amountLabel: string,
  transactionId: string,
  fromWalletAddress?: string | null,
) {
  const amount = formatAmountForPush(amountLabel);
  const from = await formatUserForPush(fromWalletAddress);

  await sendPushToUser(userId, {
    title: "Money received",
    body: `You received ${amount} from ${from} on Glide.`,
    url: "/activity",
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

  await sendPushToUser(userId, {
    title: "Payment sent",
    body: `You sent ${parsed} to ${target} on Glide.`,
    url: "/activity",
  });
}

export async function notifySwapComplete(userId: string, amount: string) {
  const parsed = formatAmountForPush(`$${amount}`);

  await sendPushToUser(userId, {
    title: "Swap complete",
    body: `You swapped ${parsed} to EURC on Glide.`,
    url: "/activity",
  });
}

/** Notify payer that someone requested money from them. */
export async function notifyPaymentRequest(
  targetUserId: string,
  amount: string,
  fromLabel: string,
  payUrl: string,
) {
  const parsed = formatAmountForPush(`$${amount}`);
  const from = formatUsernameForPush(fromLabel);

  await sendPushToUser(targetUserId, {
    title: "Payment request",
    body: `${from} requested ${parsed} on Glide.`,
    url: payUrl.startsWith("/") ? payUrl : `/pay/${payUrl}`,
  });
}

export async function notifyBridgeComplete(
  userId: string,
  amount: string,
  networkLabel: string,
) {
  const parsed = formatAmountForPush(`$${amount}`);

  await sendPushToUser(userId, {
    title: "Bridge complete",
    body: `You bridged ${parsed} to ${networkLabel} on Glide.`,
    url: "/activity",
  });
}
