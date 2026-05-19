"use client";

import type { StoredChatMessage } from "@/lib/chat-cache";
import { shortenAddress } from "@/lib/format";
import { Check, UserPlus } from "lucide-react";
import Link from "next/link";

export function ChatMessageBubble({
  message,
  onSaveContact,
  savingContact,
}: {
  message: StoredChatMessage;
  onSaveContact?: (id: string) => void;
  savingContact?: boolean;
}) {
  if (message.kind === "send_success") {
    const label =
      message.recipientName?.trim() ||
      (message.to ? shortenAddress(message.to) : "their wallet");
    return (
      <div className="flex justify-center px-1 py-1">
        <div className="glide-chat-card w-full max-w-[min(100%,320px)] overflow-hidden rounded-[28px] bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 p-5 text-white shadow-[0_12px_40px_rgba(16,185,129,0.35)]">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/25">
              <Check className="h-6 w-6" strokeWidth={2.5} />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/75">
                Payment sent
              </p>
              <p className="mt-0.5 text-2xl font-bold tracking-tight tabular-nums">
                ${message.amount}
              </p>
              <p className="mt-1 text-sm leading-snug text-white/90">
                You just sent ${message.amount} to {label}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (message.kind === "add_contact" && !message.contactSaved) {
    return (
      <div className="flex justify-start px-1 py-0.5">
        <div className="glide-chat-card w-full max-w-[min(100%,300px)] rounded-[22px] border border-violet-400/20 bg-violet-500/[0.08] p-4 backdrop-blur-sm dark:border-violet-400/15 dark:bg-violet-500/10">
          <p className="text-sm font-medium text-neutral-900 dark:text-white">
            Save{" "}
            <span className="font-semibold text-violet-600 dark:text-violet-300">
              {message.contactName}
            </span>{" "}
            to contacts?
          </p>
          <p className="mt-1 font-mono text-[11px] text-neutral-500 dark:text-white/40">
            {message.walletAddress ? shortenAddress(message.walletAddress) : ""}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={savingContact}
              onClick={() => onSaveContact?.(message.id)}
              className="glide-tap inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-violet-600 py-2.5 text-sm font-semibold text-white shadow-sm"
            >
              <UserPlus className="h-4 w-4" />
              {savingContact ? "Saving…" : "Add"}
            </button>
            <Link
              href="/contacts"
              className="glide-tap inline-flex items-center justify-center rounded-full border border-neutral-200/80 px-4 py-2.5 text-sm font-semibold dark:border-white/12"
            >
              Contacts
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (message.kind === "add_contact" && message.contactSaved) {
    return (
      <div className="flex justify-center py-1">
        <span className="rounded-full bg-neutral-100 px-3 py-1 text-[11px] font-medium text-neutral-500 dark:bg-white/8 dark:text-white/45">
          {message.contactName} added to contacts
        </span>
      </div>
    );
  }

  const isUser = message.role === "user";
  return (
    <div className={`flex px-1 py-0.5 ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`glide-chat-bubble max-w-[min(88%,280px)] text-[15px] leading-[1.45] ${
          isUser
            ? "rounded-[22px] rounded-br-[6px] bg-gradient-to-br from-violet-600 to-indigo-600 px-4 py-2.5 font-medium text-white shadow-[0_4px_20px_rgba(99,102,241,0.25)]"
            : "rounded-[22px] rounded-bl-[6px] border border-neutral-200/60 bg-white/90 px-4 py-2.5 text-neutral-800 shadow-sm dark:border-white/[0.06] dark:bg-[#1e1e22] dark:text-white/90"
        }`}
      >
        {message.text}
      </div>
    </div>
  );
}
