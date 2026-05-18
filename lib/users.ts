import { prisma } from "@/lib/db";
import { createGlideWallet, fetchWalletById } from "@/lib/wallet-service";
import type { GlideWallet } from "@/lib/types";

export type GlideDbUser = {
  id: string;
  email: string;
  displayName: string | null;
  circleWalletId: string | null;
  circleWalletAddress: string | null;
};

export async function upsertUserFromClerk(input: {
  id: string;
  email: string;
  displayName?: string | null;
}): Promise<GlideDbUser> {
  return prisma.user.upsert({
    where: { id: input.id },
    create: {
      id: input.id,
      email: input.email,
      displayName: input.displayName ?? null,
    },
    update: {
      email: input.email,
      ...(input.displayName !== undefined
        ? { displayName: input.displayName }
        : {}),
    },
  });
}

export async function getUserById(userId: string): Promise<GlideDbUser | null> {
  return prisma.user.findUnique({ where: { id: userId } });
}

export async function userOwnsWallet(
  userId: string,
  walletId: string,
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { circleWalletId: true },
  });
  return user?.circleWalletId === walletId;
}

/** One Circle SCA per Clerk user — create on first sign-in. */
export async function getOrCreateWalletForUser(input: {
  userId: string;
  email: string;
  displayName?: string | null;
}): Promise<{ user: GlideDbUser; wallet: GlideWallet }> {
  let user = await upsertUserFromClerk({
    id: input.userId,
    email: input.email,
    displayName: input.displayName,
  });

  if (user.circleWalletId) {
    let address = user.circleWalletAddress;
    if (!address) {
      const fromCircle = await fetchWalletById(user.circleWalletId);
      address = fromCircle?.address ?? null;
      if (address) {
        user = await prisma.user.update({
          where: { id: input.userId },
          data: { circleWalletAddress: address },
        });
      }
    }
    if (address && user.circleWalletId) {
      return {
        user,
        wallet: { id: user.circleWalletId, address },
      };
    }
  }

  const wallet = await createGlideWallet();

  const updated = await prisma.user.update({
    where: { id: input.userId },
    data: {
      circleWalletId: wallet.id,
      circleWalletAddress: wallet.address,
    },
  });

  return { user: updated, wallet };
}
