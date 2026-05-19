import { prisma } from "@/lib/db";

export type ScheduleFrequency = "weekly" | "monthly";

export function nextRunFromNow(frequency: ScheduleFrequency): Date {
  const d = new Date();
  if (frequency === "weekly") {
    d.setDate(d.getDate() + 7);
  } else {
    d.setMonth(d.getMonth() + 1);
  }
  return d;
}

export function advanceNextRun(current: Date, frequency: ScheduleFrequency): Date {
  const d = new Date(current);
  if (frequency === "weekly") {
    d.setDate(d.getDate() + 7);
  } else {
    d.setMonth(d.getMonth() + 1);
  }
  return d;
}

export async function listScheduledTransfers(userId: string) {
  return prisma.scheduledTransfer.findMany({
    where: { userId, active: true },
    orderBy: { nextRunAt: "asc" },
  });
}

export async function createScheduledTransfer(input: {
  userId: string;
  destination: string;
  recipientLabel?: string;
  amount: string;
  note?: string;
  frequency: ScheduleFrequency;
}) {
  return prisma.scheduledTransfer.create({
    data: {
      userId: input.userId,
      destination: input.destination.trim(),
      recipientLabel: input.recipientLabel?.trim() || null,
      amount: input.amount,
      note: input.note?.trim() || null,
      frequency: input.frequency,
      nextRunAt: nextRunFromNow(input.frequency),
    },
  });
}

export async function cancelScheduledTransfer(userId: string, id: string) {
  return prisma.scheduledTransfer.updateMany({
    where: { id, userId },
    data: { active: false },
  });
}

export async function dueScheduledTransfers(limit = 20) {
  return prisma.scheduledTransfer.findMany({
    where: { active: true, nextRunAt: { lte: new Date() } },
    orderBy: { nextRunAt: "asc" },
    take: limit,
  });
}
