import { prisma } from "@/lib/db";
import {
  RECEIVE_CHAINS,
  type ReceiveChainKey,
} from "@/lib/circle";
import { hasGasWallet } from "@/lib/gas-refill";
import { addressesEqual } from "@/lib/tokens";
import {
  createGlideWallet,
  createWalletOnChain,
  fetchWalletById,
} from "@/lib/wallet-service";
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

/** One-query ownership check that also returns the wallet address. Use on hot
 * read paths (e.g. swap quote) where we don't need the create-on-miss behavior
 * of getOrCreateWalletForUser. */
export async function getOwnedWalletAddress(
  userId: string,
  walletId: string,
): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { circleWalletId: true, circleWalletAddress: true },
  });
  if (!user || user.circleWalletId !== walletId) return null;
  return user.circleWalletAddress;
}

/** One Circle SCA per Clerk user - create on first sign-in. */
export async function getOrCreateWalletForUser(input: {
  userId: string;
  email: string;
  displayName?: string | null;
}): Promise<{ user: GlideDbUser; wallet: GlideWallet }> {
  // Hot path (every balance load): the wallet is already provisioned, so
  // skip the upsert and the Circle round-trip. requireSessionUser has
  // already ensured the row exists.
  const existing = await prisma.user.findUnique({
    where: { id: input.userId },
  });
  if (existing?.circleWalletId && existing.circleWalletAddress) {
    return {
      user: existing,
      wallet: {
        id: existing.circleWalletId,
        address: existing.circleWalletAddress,
      },
    };
  }

  let user = await upsertUserFromClerk({
    id: input.userId,
    email: input.email,
    displayName: input.displayName,
  });

  if (user.circleWalletId) {
    const fromCircle = await fetchWalletById(user.circleWalletId);
    const circleAddress = fromCircle?.address ?? null;
    let address = user.circleWalletAddress ?? circleAddress;

    if (
      circleAddress &&
      (!address || !addressesEqual(address, circleAddress))
    ) {
      address = circleAddress;
      user = await prisma.user.update({
        where: { id: input.userId },
        data: { circleWalletAddress: circleAddress },
      });
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

export type ReceiveAddress = {
  chain: ReceiveChainKey;
  label: string;
  circleBlockchain: string;
  walletId: string;
  address: string;
  /** False when the chain has no gas service wallet (see hasGasWallet). */
  enabled?: boolean;
};

/** Lazily provision a Circle SCA on the given receive chain for this user,
 * persist it in WalletAddress, and return the address. Idempotent. */
export async function getOrCreateReceiveAddress(
  userId: string,
  chain: ReceiveChainKey,
): Promise<ReceiveAddress> {
  const def = RECEIVE_CHAINS[chain];

  const existing = await prisma.walletAddress.findUnique({
    where: { userId_chain: { userId, chain: def.circleBlockchain } },
  });
  if (existing) {
    return {
      chain,
      label: def.label,
      circleBlockchain: def.circleBlockchain,
      walletId: existing.walletId,
      address: existing.address,
    };
  }

  const created = await createWalletOnChain(def.circleBlockchain);
  await prisma.walletAddress.create({
    data: {
      userId,
      chain: def.circleBlockchain,
      walletId: created.id,
      address: created.address,
    },
  });

  return {
    chain,
    label: def.label,
    circleBlockchain: def.circleBlockchain,
    walletId: created.id,
    address: created.address,
  };
}

/** Universal Receive addresses for a user: created if missing on every chain
 * with a gas service wallet. Addresses already created on other chains are
 * returned too (never created anew), flagged enabled: false, so the caller
 * can still surface funds sent there. */
export async function getReceiveAddresses(
  userId: string,
): Promise<ReceiveAddress[]> {
  const existing = await prisma.walletAddress.findMany({
    where: { userId },
    select: { chain: true },
  });
  const provisioned = new Set(existing.map((row) => row.chain));
  const chains = (Object.keys(RECEIVE_CHAINS) as ReceiveChainKey[]).filter(
    (chain) =>
      hasGasWallet(RECEIVE_CHAINS[chain].circleBlockchain) ||
      provisioned.has(RECEIVE_CHAINS[chain].circleBlockchain),
  );
  return Promise.all(
    chains.map(async (chain) => ({
      ...(await getOrCreateReceiveAddress(userId, chain)),
      enabled: hasGasWallet(RECEIVE_CHAINS[chain].circleBlockchain),
    })),
  );
}

/** Reverse lookup: which Glide user owns this address on the given Circle
 * blockchain? Used by the webhook handler to route inbound USDC. */
export async function findUserByReceiveAddress(
  circleBlockchain: string,
  address: string,
): Promise<{ userId: string; walletId: string } | null> {
  const row = await prisma.walletAddress.findFirst({
    where: { chain: circleBlockchain, address },
    select: { userId: true, walletId: true },
  });
  return row;
}
