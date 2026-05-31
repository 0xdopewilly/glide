"use client";

import type { StoredChatMessage } from "@/lib/chat-cache";
import { formatStableAmountWithCode } from "@/lib/currency-format";
import { shortenAddress } from "@/lib/format";

/** Renders a [Confirm] / [Cancel] card before any money action fires.
 * The chat parent owns the click handlers + the pending/confirmed/cancelled
 * status transition, so this stays pure presentation. */
export function ConfirmActionCard({
  message,
  busy,
  onConfirm,
  onCancel,
}: {
  message: StoredChatMessage;
  busy: boolean;
  onConfirm: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  if (message.kind !== "confirm_action") return null;
  const status = message.confirmStatus ?? "pending";

  const headline = headlineFor(message);
  const detail = detailFor(message);

  const disabled = status !== "pending" || busy;

  return (
    <div
      className="glide-chat-enter rounded-2xl border p-4"
      style={{
        background: "var(--glide-surface-elevated)",
        borderColor: "var(--glide-border)",
      }}
    >
      <p className="glide-label-mono text-[11px] font-semibold text-[var(--glide-muted)]">
        Confirm
      </p>
      <p className="mt-2 text-[18px] font-bold tracking-tight text-[var(--glide-text)]">
        {headline}
      </p>
      {detail ? (
        <p className="mt-1.5 text-[13px] text-[var(--glide-muted)]">{detail}</p>
      ) : null}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => onConfirm(message.id)}
          disabled={disabled}
          className="glide-tap glide-label-mono inline-flex flex-1 items-center justify-center rounded-full py-2.5 text-[12px] font-bold disabled:opacity-40"
          style={{
            background: "var(--glide-accent)",
            color: "var(--glide-bg)",
          }}
        >
          {status === "pending"
            ? "Confirm"
            : status === "confirmed"
              ? "Sent"
              : status === "cancelled"
                ? "Cancelled"
                : "Failed"}
        </button>
        <button
          type="button"
          onClick={() => onCancel(message.id)}
          disabled={disabled}
          className="glide-tap glide-label-mono inline-flex flex-1 items-center justify-center rounded-full border py-2.5 text-[12px] font-bold disabled:opacity-40"
          style={{
            background: "var(--glide-surface-container)",
            borderColor: "var(--glide-border)",
            color: "var(--glide-text)",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function headlineFor(message: StoredChatMessage): string {
  const token = message.token ?? "USDC";
  const amount = message.amount ?? "0";
  switch (message.confirmKind) {
    case "send":
      return `Send ${formatStableAmountWithCode(amount, token)} to ${recipientLabel(message)}`;
    case "send_batch": {
      const parts =
        message.transfers?.map((t) =>
          formatStableAmountWithCode(t.amount, t.token),
        ) ?? [];
      return `Send ${parts.join(" + ")} to ${recipientLabel(message)}`;
    }
    case "request":
      return `Request ${formatStableAmountWithCode(amount, token)} from @${message.glideTag ?? ""}`;
    case "split":
      return `Request shares of ${formatStableAmountWithCode(amount, token)} from ${
        message.recipients?.length ?? 0
      } people`;
    default:
      return "Confirm action";
  }
}

function detailFor(message: StoredChatMessage): string | null {
  switch (message.confirmKind) {
    case "send":
    case "send_batch":
      return message.to && /^0x/.test(message.to)
        ? shortenAddress(message.to)
        : null;
    case "split":
      return message.recipients?.length
        ? message.recipients.map((r) => `@${r}`).join(", ")
        : null;
    default:
      return null;
  }
}

function recipientLabel(message: StoredChatMessage): string {
  if (message.recipientName) return message.recipientName;
  if (message.to && /^0x/.test(message.to)) return shortenAddress(message.to);
  return message.to ?? "recipient";
}
