"use client";

import { ActionSuccessCard } from "@/components/chat/action-success-card";
import { ConfirmActionCard } from "@/components/chat/confirm-action-card";
import type { ActionSuccessType, StoredChatMessage } from "@/lib/chat-cache";
import { formatChatBubbleText, isEthAddress, shortenAddress } from "@/lib/format";
import { UserPlus } from "lucide-react";

function resolveSuccessAction(
  message: StoredChatMessage,
): ActionSuccessType | null {
  if (message.kind === "action_success" && message.successAction) {
    return message.successAction;
  }
  if (message.kind === "send_success") return "send";
  return null;
}

export function ChatMessageBubble({
  message,
  onSaveContact,
  onSkipContact,
  savingContact,
  onConfirmAction,
  onCancelAction,
  confirmBusy,
}: {
  message: StoredChatMessage;
  onSaveContact?: (id: string) => void;
  onSkipContact?: (id: string) => void;
  savingContact?: boolean;
  onConfirmAction?: (id: string) => void;
  onCancelAction?: (id: string) => void;
  confirmBusy?: boolean;
}) {
  if (message.kind === "confirm_action") {
    return (
      <ConfirmActionCard
        message={message}
        busy={!!confirmBusy}
        onConfirm={(id) => onConfirmAction?.(id)}
        onCancel={(id) => onCancelAction?.(id)}
      />
    );
  }
  const successAction = resolveSuccessAction(message);
  if (successAction) {
    return (
      <div className="glide-chat-enter">
        <ActionSuccessCard
          action={successAction}
          amount={message.amount}
          recipientName={message.recipientName}
          to={message.to}
          token={message.token}
          targetToken={message.targetToken}
          receivedAmount={message.receivedAmount}
          network={message.network}
        />
      </div>
    );
  }

  if (
    message.kind === "add_contact" &&
    !message.contactSaved &&
    !message.contactSkipped
  ) {
    return (
      <div className="glide-chat-enter flex justify-start px-1 py-0.5">
        <div
          className="max-w-[min(88%,280px)] rounded-[20px] rounded-bl-[6px] border px-3.5 py-3"
          style={{
            background: "var(--glide-surface-elevated)",
            borderColor: "var(--glide-border)",
          }}
        >
          <p className="text-[15px] leading-snug text-[var(--glide-text)]">
            Add{" "}
            <span className="font-semibold">{message.contactName}</span> to
            contacts?
          </p>
          {message.walletAddress ? (
            <p className="mt-1 font-mono text-[11px] text-[var(--glide-muted)]">
              {shortenAddress(message.walletAddress)}
            </p>
          ) : null}
          <div className="mt-2.5 flex gap-2">
            <button
              type="button"
              disabled={savingContact}
              onClick={() => onSaveContact?.(message.id)}
              className="glide-tap inline-flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-sm font-semibold disabled:opacity-40"
              style={{
                background: "var(--glide-accent)",
                color: "var(--glide-bg)",
              }}
            >
              <UserPlus className="h-4 w-4" />
              {savingContact ? "Saving…" : "Yes"}
            </button>
            <button
              type="button"
              onClick={() => onSkipContact?.(message.id)}
              className="glide-tap inline-flex items-center justify-center rounded-full border px-3.5 py-2 text-sm font-medium"
              style={{
                borderColor: "var(--glide-border)",
                color: "var(--glide-muted)",
              }}
            >
              Later
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (message.kind === "add_contact" && message.contactSaved) {
    return (
      <div className="glide-chat-enter flex justify-start px-2 py-0.5">
        <span className="text-[12px] text-[var(--glide-muted)]">
          {message.contactName} saved to contacts
        </span>
      </div>
    );
  }

  if (message.kind === "add_contact" && message.contactSkipped) {
    return null;
  }

  const isUser = message.role === "user";
  const rawText = message.text ?? "";
  const isAddress = isUser && isEthAddress(rawText);
  const bubbleText = formatChatBubbleText(rawText);

  return (
    <div
      className={`glide-chat-enter flex w-full min-w-0 px-1 py-0.5 ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`min-w-0 max-w-[min(88%,280px)] text-[15px] leading-[1.45] [overflow-wrap:anywhere] break-words ${
          isUser
            ? "rounded-[20px] rounded-br-[6px] px-3.5 py-2.5 font-medium"
            : "rounded-[20px] rounded-bl-[6px] border px-3.5 py-2.5"
        } ${isAddress ? "font-mono text-[13px] tracking-tight" : ""}`}
        style={
          isUser
            ? {
                background: "var(--glide-accent)",
                color: "var(--glide-bg)",
              }
            : {
                background: "var(--glide-surface-elevated)",
                borderColor: "var(--glide-border)",
                color: "var(--glide-text)",
              }
        }
        title={isAddress ? rawText.trim() : undefined}
      >
        {bubbleText}
      </div>
    </div>
  );
}
