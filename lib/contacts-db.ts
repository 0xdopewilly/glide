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
