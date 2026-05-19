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
      <div className="glide-chat-card mr-4 max-w-[92%] overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 p-4 text-white shadow-lg shadow-emerald-500/20">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20">
            <Check className="h-6 w-6" strokeWidth={2.5} />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/80">
              Payment sent
            </p>
            <p className="mt-1 text-xl font-bold tracking-tight">
              ${message.amount}
            </p>
            <p className="mt-1 text-sm leading-snug text-white/90">
              You just sent ${message.amount} to {label}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (message.kind === "add_contact" && !message.contactSaved) {
    return (
      <div className="glide-chat-card mr-4 max-w-[92%] rounded-3xl border border-violet-500/25 bg-violet-500/10 px-4 py-3 dark:bg-violet-500/15">
        <p className="text-sm font-medium text-neutral-900 dark:text-white">
          Add <span className="font-semibold">{message.contactName}</span> to contacts?
        </p>
        <p className="mt-0.5 font-mono text-[11px] text-neutral-500 dark:text-white/45">
          {message.walletAddress ? shortenAddress(message.walletAddress) : ""}
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={savingContact}
            onClick={() => onSaveContact?.(message.id)}
            className="glide-tap inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-violet-600 py-2 text-sm font-semibold text-white"
          >
            <UserPlus className="h-4 w-4" />
            {savingContact ? "Saving…" : "Add contact"}
          </button>
          <Link
            href="/contacts"
            className="glide-tap inline-flex items-center justify-center rounded-full border border-neutral-200 px-3 py-2 text-sm font-semibold dark:border-white/15"
          >
            View all
          </Link>
        </div>
      </div>
    );
  }

  if (message.kind === "add_contact" && message.contactSaved) {
    return (
      <p className="mr-6 text-xs glide-muted px-1">
        {message.contactName} saved to contacts.
      </p>
    );
  }

  const isUser = message.role === "user";
  return (
    <div
      className={`glide-chat-bubble max-w-[88%] text-[15px] leading-relaxed ${
        isUser
          ? "ml-auto rounded-[22px] rounded-br-md bg-neutral-950 px-4 py-2.5 text-white shadow-md dark:bg-white dark:text-neutral-950"
          : "mr-auto rounded-[22px] rounded-bl-md bg-neutral-100 px-4 py-2.5 text-neutral-900 dark:bg-[#252528] dark:text-white/92"
      }`}
    >
      {message.text}
    </div>
  );
}
