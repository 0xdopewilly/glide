import { prisma } from "@/lib/db";
import { isValidUsername, normalizeUsername } from "@/lib/validation";

export type GlideUserByUsername = {
  id: string;
  username: string;
  displayName: string | null;
  circleWalletAddress: string | null;
};

export async function findUserByUsername(
  raw: string,
): Promise<GlideUserByUsername | null> {
  const username = normalizeUsername(raw);
  if (!isValidUsername(username)) return null;

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      displayName: true,
      circleWalletAddress: true,
    },
  });

  if (!user?.username || !user.circleWalletAddress) return null;

  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    circleWalletAddress: user.circleWalletAddress,
  };
}

export async function findUserByWalletAddress(
  address: string,
): Promise<GlideUserByUsername | null> {
  const normalized = address.trim().toLowerCase();
  if (!normalized.startsWith("0x")) return null;

  const user = await prisma.user.findFirst({
    where: { circleWalletAddress: { equals: normalized, mode: "insensitive" } },
    select: {
      id: true,
      username: true,
      displayName: true,
      circleWalletAddress: true,
    },
  });

  if (!user?.circleWalletAddress) return null;

  return {
    id: user.id,
    username: user.username ?? "",
    displayName: user.displayName,
    circleWalletAddress: user.circleWalletAddress,
  };
}

export async function findUserByEmail(
  email: string,
): Promise<GlideUserByUsername | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) return null;

  const user = await prisma.user.findUnique({
    where: { email: normalized },
    select: {
      id: true,
      username: true,
      displayName: true,
      circleWalletAddress: true,
    },
  });

  if (!user?.circleWalletAddress) return null;

  return {
    id: user.id,
    username: user.username ?? "",
    displayName: user.displayName,
    circleWalletAddress: user.circleWalletAddress,
  };
}

export async function isUsernameAvailable(raw: string): Promise<boolean> {
  const username = normalizeUsername(raw);
  if (!isValidUsername(username)) return false;

  const existing = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });
  return !existing;
}
