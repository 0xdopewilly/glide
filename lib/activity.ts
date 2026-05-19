import type { GlideTransaction, TransactionKind } from "@/lib/types";

export type ActivityPeriod = "all" | "today" | "week" | "month" | "year";
export type ActivityKindFilter = "all" | TransactionKind;

export type ActivityDateGroup = {
  label: string;
  items: GlideTransaction[];
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function activityDateGroupLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Earlier";

  const now = new Date();
  const today = startOfDay(now);
  const day = startOfDay(date);
  const diffDays = Math.round((today.getTime() - day.getTime()) / 86_400_000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) {
    return date.toLocaleDateString("en-US", { weekday: "long" });
  }
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  }
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function txTimestamp(tx: GlideTransaction): number {
  if (tx.createdAt) {
    const t = new Date(tx.createdAt).getTime();
    if (!Number.isNaN(t)) return t;
  }
  return 0;
}

export function filterByKind(
  transactions: GlideTransaction[],
  kind: ActivityKindFilter,
): GlideTransaction[] {
  if (kind === "all") return transactions;
  return transactions.filter((t) => t.kind === kind);
}

export function filterByPeriod(
  transactions: GlideTransaction[],
  period: ActivityPeriod,
): GlideTransaction[] {
  if (period === "all") return transactions;

  const now = new Date();
  const todayStart = startOfDay(now).getTime();

  return transactions.filter((tx) => {
    const ts = txTimestamp(tx);
    if (!ts) return false;

    if (period === "today") {
      return ts >= todayStart;
    }

    const ageMs = now.getTime() - ts;
    if (period === "week") return ageMs <= 7 * 86_400_000;
    if (period === "month") return ageMs <= 30 * 86_400_000;
    if (period === "year") return new Date(ts).getFullYear() === now.getFullYear();
    return true;
  });
}

export function groupTransactionsByDate(
  transactions: GlideTransaction[],
): ActivityDateGroup[] {
  const sorted = [...transactions].sort((a, b) => txTimestamp(b) - txTimestamp(a));
  const map = new Map<string, GlideTransaction[]>();

  for (const tx of sorted) {
    const label = tx.createdAt
      ? activityDateGroupLabel(tx.createdAt)
      : tx.meta || "Earlier";
    const bucket = map.get(label) ?? [];
    bucket.push(tx);
    map.set(label, bucket);
  }

  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
}

export function sortTransactionsNewest(
  transactions: GlideTransaction[],
): GlideTransaction[] {
  return [...transactions].sort((a, b) => txTimestamp(b) - txTimestamp(a));
}

/** Time + status line for activity rows. */
export function activityRowMeta(tx: GlideTransaction): string {
  const parts: string[] = [];
  if (tx.createdAt) {
    const t = new Date(tx.createdAt);
    if (!Number.isNaN(t.getTime())) {
      parts.push(
        t.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
      );
    }
  }
  if (tx.status) {
    parts.push(tx.status.replace(/_/g, " ").toLowerCase());
  }
  return parts.length > 0 ? parts.join(" · ") : tx.meta;
}
