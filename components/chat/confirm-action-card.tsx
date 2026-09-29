"use client";

import type { StoredChatMessage } from "@/lib/chat-cache";
import { formatStableAmountWithCode } from "@/lib/currency-format";
import { shortenAddress } from "@/lib/format";
import { Check, CircleAlert, X } from "lucide-react";

/** Renders a [Confirm] / [Cancel] card before any money action fires.
 * The chat parent owns the click handlers + the pending/confirmed/cancelled
 * status transition, so this stays pure presentation. */
export function ConfirmActionCard({
  message,
  busy,
  onConfirm,
  onCancel,
  enter = true,
}: {
  message: StoredChatMessage;
  busy: boolean;
  onConfirm: (id: string) => void;
  onCancel: (id: string) => void;
  enter?: boolean;
}) {
  if (message.kind !== "confirm_action") return null;
  const status = message.confirmStatus ?? "pending";

  const headline = headlineFor(message);
  const detail = detailFor(message);

  const disabled = status !== "pending" || busy;

  return (
    <div
      className={`${enter ? "glide-chat-enter " : ""}rounded-2xl border p-4`}
      style={{
        background: "var(--glide-surface-elevated)",
        borderColor: "var(--glide-elevated-border)",
      }}
    >
      {status === "pending" ? (
        <p className="mb-1.5 text-[12px] font-semibold text-[var(--glide-muted)]">
          Review and confirm
        </p>
      ) : null}
      <p className="text-[17px] font-semibold tracking-tight text-[var(--glide-text)]">
        {headline}
      </p>
      {detail ? (
        <p className="mt-1 text-[13px] text-[var(--glide-muted)]">{detail}</p>
      ) : null}

      {status === "pending" ? (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => onConfirm(message.id)}
            disabled={disabled}
            className="glide-tap inline-flex flex-1 items-center justify-center rounded-full py-2.5 text-[14px] font-semibold disabled:opacity-40"
            style={{
              background: "var(--glide-primary)",
              color: "var(--glide-on-primary)",
            }}
          >
            Confirm
          </button>
          <button
            type="button"
            onClick={() => onCancel(message.id)}
            disabled={disabled}
            className="glide-tap inline-flex flex-1 items-center justify-center rounded-full border py-2.5 text-[14px] font-semibold disabled:opacity-40"
            style={{
              background: "var(--glide-surface-container)",
              borderColor: "var(--glide-border)",
              color: "var(--glide-text)",
            }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <StatusLine status={status} kind={message.confirmKind} />
      )}
    </div>
  );
}

/** After the choice: a quiet status line instead of two disabled buttons. */
function StatusLine({
  status,
  kind,
}: {
  status: "confirmed" | "cancelled" | "failed";
  kind: StoredChatMessage["confirmKind"];
}) {
  const done = kind === "swap" || kind === "bridge" || kind === "rule";
  const view =
    status === "confirmed"
      ? { Icon: Check, label: done ? "Done" : kind === "request" || kind === "split" ? "Requested" : "Sent", color: "var(--glide-success)" }
      : status === "cancelled"
        ? { Icon: X, label: "Cancelled", color: "var(--glide-muted)" }
        : { Icon: CircleAlert, label: "Didn't go through", color: "var(--glide-error)" };
  const { Icon } = view;
  return (
    <p
      className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold"
      style={{ color: view.color }}
    >
      <Icon className="h-4 w-4" strokeWidth={2.5} aria-hidden />
      {view.label}
    </p>
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
    case "swap":
    case "bridge":
    case "rule":
      return message.confirmText ?? "Confirm action";
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
