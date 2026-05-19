"use client";

import { ActionSuccessCard } from "@/components/chat/action-success-card";
import type { ActionSuccessType, StoredChatMessage } from "@/lib/chat-cache";
import { formatChatBubbleText, isEthAddress, shortenAddress } from "@/lib/format";
import { UserPlus } from "lucide-react";
import Link from "next/link";

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
  savingContact,
}: {
  message: StoredChatMessage;
  onSaveContact?: (id: string) => void;
  savingContact?: boolean;
}) {
  const successAction = resolveSuccessAction(message);
  if (successAction) {
    return (
      <ActionSuccessCard
        action={successAction}
        amount={message.amount}
        recipientName={message.recipientName}
        to={message.to}
        targetToken={message.targetToken}
        network={message.network}
      />
    );
  }

  if (message.kind === "add_contact" && !message.contactSaved) {
    return (
      <div className="flex justify-start px-1 py-0.5">
        <div className="glide-chat-card max-w-[min(88%,280px)] rounded-[20px] rounded-bl-[6px] border border-neutral-200/60 bg-white/90 px-3.5 py-3 dark:border-white/[0.06] dark:bg-[#1e1e22]">
          <p className="text-[15px] leading-snug text-neutral-800 dark:text-white/90">
            Add{" "}
            <span className="font-semibold text-violet-600 dark:text-violet-300">
              {message.contactName}
            </span>{" "}
            to contacts?
          </p>
          {message.walletAddress ? (
            <p className="mt-1 font-mono text-[11px] text-neutral-500 dark:text-white/40">
              {shortenAddress(message.walletAddress)}
            </p>
          ) : null}
          <div className="mt-2.5 flex gap-2">
            <button
              type="button"
              disabled={savingContact}
              onClick={() => onSaveContact?.(message.id)}
              className="glide-tap inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-violet-600 py-2 text-sm font-semibold text-white"
            >
              <UserPlus className="h-4 w-4" />
              {savingContact ? "Saving…" : "Yes"}
            </button>
            <Link
              href="/contacts"
              className="glide-tap inline-flex items-center justify-center rounded-full border border-neutral-200/80 px-3.5 py-2 text-sm font-medium text-neutral-600 dark:border-white/12 dark:text-white/70"
            >
              Later
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (message.kind === "add_contact" && message.contactSaved) {
    return (
      <div className="flex justify-start px-2 py-0.5">
        <span className="text-[12px] text-neutral-500 dark:text-white/40">
          {message.contactName} saved to contacts
        </span>
      </div>
    );
  }

  const isUser = message.role === "user";
  const rawText = message.text ?? "";
  const isAddress = isUser && isEthAddress(rawText);
  const bubbleText = formatChatBubbleText(rawText);

  return (
    <div
      className={`flex w-full min-w-0 px-1 py-0.5 ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`glide-chat-bubble min-w-0 max-w-[min(88%,280px)] text-[15px] leading-[1.45] [overflow-wrap:anywhere] break-words ${
          isUser
            ? "rounded-[20px] rounded-br-[6px] bg-violet-600 px-3.5 py-2.5 font-medium text-white"
            : "rounded-[20px] rounded-bl-[6px] border border-neutral-200/60 bg-white/90 px-3.5 py-2.5 text-neutral-800 dark:border-white/[0.06] dark:bg-[#1e1e22] dark:text-white/90"
        } ${isAddress ? "font-mono text-[13px] tracking-tight" : ""}`}
        title={isAddress ? rawText.trim() : undefined}
      >
        {bubbleText}
      </div>
    </div>
  );
}
