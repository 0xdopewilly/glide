import type { GlideTransaction } from "@/lib/types";

export function TransactionList({
  transactions,
  emptyMessage = "No activity yet",
}: {
  transactions: GlideTransaction[];
  emptyMessage?: string;
}) {
  if (transactions.length === 0) {
    return (
      <p
        className="rounded-2xl border border-dashed px-4 py-8 text-center text-sm font-medium tracking-tight glide-muted"
        style={{ borderColor: "var(--glide-border)" }}
      >
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {transactions.map((item) => (
        <li key={item.id}>
          <TransactionRow {...item} />
        </li>
      ))}
    </ul>
  );
}

function TransactionRow({
  title,
  amount,
  variant,
  meta,
  status,
}: GlideTransaction) {
  const isCredit = variant === "credit";

  return (
    <article
      className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 ${
        isCredit ? "border-emerald-500/30 bg-emerald-500/10" : "glide-surface-card shadow-sm"
      }`}
    >
      <div className="min-w-0 text-left">
        <p className="truncate text-[15px] font-medium tracking-tight">
          {title}
        </p>
        <p className="mt-0.5 text-xs font-medium glide-muted">
          {meta}
          {status ? ` · ${status}` : ""}
        </p>
      </div>
      <p
        className={`shrink-0 text-[15px] font-semibold tracking-tight ${
          isCredit ? "text-emerald-600 dark:text-emerald-400" : ""
        }`}
        style={isCredit ? undefined : { color: "var(--glide-text)" }}
      >
        {amount}
      </p>
    </article>
  );
}
