import { prisma } from "@/lib/db";
import { normalizeTokenSymbol } from "@/lib/tokens";
import { randomBytes } from "crypto";

function newCode() {
  return randomBytes(5).toString("hex");
}

export function paymentRequestUrl(code: string, origin?: string) {
  const base =
    origin?.replace(/\/$/, "") ??
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "https://glide-arc.vercel.app";
  return `${base}/pay/${code}`;
}

export async function createPaymentRequest(input: {
  userId: string;
  amount: string;
  token?: string;
  note?: string;
  targetUserId?: string;
  requestFromEmail?: string;
  requestFromGlideTag?: string;
}) {
  const token = normalizeTokenSymbol(input.token);
  for (let i = 0; i < 5; i++) {
    const code = newCode();
    try {
      return await prisma.paymentRequest.create({
        data: {
          userId: input.userId,
          amount: input.amount,
          token,
          note: input.note?.trim() || null,
          code,
          targetUserId: input.targetUserId ?? null,
          requestFromEmail: input.requestFromEmail?.trim().toLowerCase() || null,
          requestFromGlideTag: input.requestFromGlideTag?.trim().toLowerCase() || null,
        },
        include: {
          user: { select: { username: true, displayName: true } },
        },
      });
    } catch {
      /* code collision — retry */
    }
  }
  throw new Error("Could not create payment request");
}

export async function getPaymentRequestByCode(code: string) {
  return prisma.paymentRequest.findUnique({
    where: { code: code.trim().toLowerCase() },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
          circleWalletAddress: true,
        },
      },
    },
  });
}

export async function markPaymentRequestPaid(code: string, paidByUserId: string) {
  return prisma.paymentRequest.updateMany({
    where: { code: code.trim().toLowerCase(), status: "pending" },
    data: { status: "paid", paidByUserId },
  });
}
