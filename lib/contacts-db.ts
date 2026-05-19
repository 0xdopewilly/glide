import { prisma } from "@/lib/db";
import { isValidWalletAddress } from "@/lib/validation";

export type GlideContact = {
  id: string;
  name: string;
  walletAddress: string;
};

export async function listContacts(userId: string): Promise<GlideContact[]> {
  const rows = await prisma.contact.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    walletAddress: r.walletAddress,
  }));
}

export async function findContactByName(userId: string, name: string) {
  const normalized = name.trim().toLowerCase();
  const rows = await prisma.contact.findMany({ where: { userId } });
  return (
    rows.find((r) => r.name.toLowerCase() === normalized) ??
    rows.find((r) => r.name.toLowerCase().includes(normalized)) ??
    null
  );
}

export async function findContactByWallet(userId: string, walletAddress: string) {
  const normalized = walletAddress.trim().toLowerCase();
  if (!normalized.startsWith("0x")) return null;

  const row = await prisma.contact.findFirst({
    where: {
      userId,
      walletAddress: { equals: normalized, mode: "insensitive" },
    },
  });

  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    walletAddress: row.walletAddress,
  };
}

export async function contactExistsForRecipient(
  userId: string,
  walletAddress: string,
  name?: string | null,
) {
  const byWallet = await findContactByWallet(userId, walletAddress);
  if (byWallet) return byWallet;
  if (name?.trim()) {
    return findContactByName(userId, name);
  }
  return null;
}

export async function createContact(
  userId: string,
  name: string,
  walletAddress: string,
): Promise<GlideContact> {
  if (!isValidWalletAddress(walletAddress)) {
    throw new Error("Invalid wallet address");
  }
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Name is required");

  const row = await prisma.contact.create({
    data: {
      userId,
      name: trimmed,
      walletAddress: walletAddress.toLowerCase(),
    },
  });
  return { id: row.id, name: row.name, walletAddress: row.walletAddress };
}
