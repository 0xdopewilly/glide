import { prisma } from "@/lib/db";

export type ScheduleFrequency = "daily" | "weekly" | "monthly" | "minutely";

export const SCHEDULE_FREQUENCIES: ScheduleFrequency[] = [
  "daily",
  "weekly",
  "monthly",
  "minutely",
];

export function isScheduleFrequency(value: string): value is ScheduleFrequency {
  return SCHEDULE_FREQUENCIES.includes(value as ScheduleFrequency);
}

export function scheduleFrequencyLabel(frequency: string): string {
  switch (frequency) {
    case "daily":
      return "Daily";
    case "weekly":
      return "Weekly";
    case "monthly":
      return "Monthly";
    case "minutely":
      return "Every minute (test)";
    default:
      return frequency;
  }
}

export function formatNextScheduledRun(iso: string, frequency: string): string {
  const d = new Date(iso);
  if (frequency === "minutely") {
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }
  return d.toLocaleDateString("en-US", {
    weekday: frequency === "weekly" ? "short" : undefined,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function addInterval(from: Date, frequency: ScheduleFrequency): Date {
  const d = new Date(from);
  switch (frequency) {
    case "minutely":
      d.setMinutes(d.getMinutes() + 1);
      break;
    case "daily":
      d.setDate(d.getDate() + 1);
      break;
    case "weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "monthly":
      d.setMonth(d.getMonth() + 1);
      break;
  }
  return d;
}

export function nextRunFromNow(frequency: ScheduleFrequency): Date {
  return addInterval(new Date(), frequency);
}

export function advanceNextRun(
  current: Date,
  frequency: ScheduleFrequency,
): Date {
  return addInterval(current, frequency);
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
