"use client";

import { ChatMessageBubble } from "@/components/chat/chat-message";
import type { GlideIntent } from "@/lib/agent-intents";
import {
  readChatHistory,
  writeChatHistory,
  type StoredChatMessage,
} from "@/lib/chat-cache";
import { useAuth } from "@/context/auth-context";
import { useWallet } from "@/context/wallet-context";
import { ArrowUp, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

const WELCOME: StoredChatMessage = {
  id: "welcome",
  role: "assistant",
  kind: "text",
  text: "Hi — I can send, swap, bridge, or open scan. What do you need?",
};

function toAgentHistory(messages: StoredChatMessage[]) {
  return messages
    .filter((m) => m.kind === "text" && m.text)
    .map((m) => ({
      role: m.role,
      content: m.text!,
    }));
}

export function GlideAssistantChat({ variant = "page" }: { variant?: "page" }) {
  const router = useRouter();
  const { user } = useAuth();
  const { sendMoney, swapMoney, bridgeMoney, refresh, clearError } = useWallet();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [savingContactId, setSavingContactId] = useState<string | null>(null);
  const [messages, setMessages] = useState<StoredChatMessage[]>([WELCOME]);
  const [hydrated, setHydrated] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isPage = variant === "page";
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    setMessages(readChatHistory(userId));
    setHydrated(true);
  }, [userId]);

  useEffect(() => {
    if (!hydrated || !userId) return;
    writeChatHistory(messages, userId);
  }, [messages, hydrated, userId]);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  }, []);

  const pushMessage = useCallback(
    (msg: StoredChatMessage) => {
      setMessages((prev) => [...prev, msg]);
      scrollToEnd();
    },
    [scrollToEnd],
  );

  const runIntent = useCallback(
    async (intent: GlideIntent) => {
      clearError();
      if (intent.action === "navigate") {
        router.push(intent.path);
        return;
      }
      if (intent.action === "send") {
        const ok = await sendMoney(intent.to, intent.amount);
        if (ok) {
          const label = intent.recipientName?.trim();
          pushMessage({
            id: `success-${Date.now()}`,
            role: "assistant",
            kind: "send_success",
            amount: intent.amount,
            to: intent.to,
            recipientName: label,
          });
          if (label) {
            pushMessage({
              id: `contact-${Date.now()}`,
              role: "assistant",
              kind: "add_contact",
              contactName: label,
              walletAddress: intent.to,
              contactSaved: false,
            });
          }
          await refresh();
        } else {
          pushMessage({
            id: `err-${Date.now()}`,
            role: "assistant",
            kind: "text",
            text: "Send didn't go through. Check your balance and try again.",
          });
        }
        return;
      }
      if (intent.action === "swap") {
        const ok = await swapMoney(intent.amount);
        pushMessage({
          id: `swap-${Date.now()}`,
          role: "assistant",
          kind: "text",
          text: ok
            ? `Swapped $${intent.amount} to EURC.`
            : "Swap didn't complete. Check the error banner on screen.",
        });
        if (ok) await refresh();
        return;
      }
      if (intent.action === "bridge") {
        const ok = await bridgeMoney(intent.amount, intent.network);
        pushMessage({
          id: `bridge-${Date.now()}`,
          role: "assistant",
          kind: "text",
          text: ok
            ? `Bridge started for $${intent.amount}.`
            : "Bridge didn't complete. Try again in a moment.",
        });
        if (ok) await refresh();
      }
    },
    [bridgeMoney, clearError, pushMessage, refresh, router, sendMoney, swapMoney],
  );

  const saveContact = async (messageId: string) => {
    const msg = messages.find((m) => m.id === messageId);
    if (!msg || msg.kind !== "add_contact" || !msg.contactName || !msg.walletAddress) {
      return;
    }
    setSavingContactId(messageId);
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: msg.contactName,
          walletAddress: msg.walletAddress,
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        pushMessage({
          id: `contact-err-${Date.now()}`,
          role: "assistant",
          kind: "text",
          text: data.error ?? "Could not save contact.",
        });
        return;
      }
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, contactSaved: true } : m,
        ),
      );
    } finally {
      setSavingContactId(null);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const text = message.trim();
    if (!text || busy) return;

    setMessage("");
    pushMessage({
      id: `user-${Date.now()}`,
      role: "user",
      kind: "text",
      text,
    });
    setBusy(true);

    try {
      const history = toAgentHistory(messages);
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });
      const data = (await res.json()) as {
        reply?: string;
        intent?: GlideIntent;
        error?: string;
      };

      if (!res.ok) {
        pushMessage({
          id: `err-${Date.now()}`,
          role: "assistant",
          kind: "text",
          text: data.error ?? data.reply ?? "Something went wrong.",
        });
        return;
      }

      if (data.intent && data.intent.action !== "reply") {
        await runIntent(data.intent);
      } else if (data.reply) {
        pushMessage({
          id: `asst-${Date.now()}`,
          role: "assistant",
          kind: "text",
          text: data.reply,
        });
      }
    } catch {
      pushMessage({
        id: `err-${Date.now()}`,
        role: "assistant",
        kind: "text",
        text: "Couldn't reach Glide assistant. Try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (isPage) inputRef.current?.focus();
  }, [isPage]);

  useEffect(() => {
    scrollToEnd();
  }, [messages, scrollToEnd]);

  return (
    <div
      className={
        isPage
          ? "flex min-h-0 flex-1 flex-col"
          : "flex w-full max-w-[min(100%,340px)] flex-col overflow-hidden rounded-3xl border border-neutral-200/90 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.18)] dark:border-white/10 dark:bg-[#141416]"
      }
    >
      {isPage ? (
        <header className="flex items-center gap-2 border-b border-neutral-100 px-5 py-4 dark:border-white/10">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <p className="text-base font-semibold tracking-tight">Glide</p>
            <p className="text-xs glide-muted">Send, swap, bridge — just ask</p>
          </div>
        </header>
      ) : null}

      <div
        ref={listRef}
        className={`glide-scroll flex flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-4 py-4 ${
          isPage ? "min-h-0" : "max-h-[min(42vh,320px)] min-h-[120px]"
        }`}
      >
        {messages.map((m) => (
          <div key={m.id} className="glide-chat-row">
            <ChatMessageBubble
              message={m}
              savingContact={savingContactId === m.id}
              onSaveContact={saveContact}
            />
          </div>
        ))}
        {busy ? (
          <div className="glide-chat-typing mr-auto flex gap-1 rounded-2xl rounded-bl-md bg-neutral-100 px-4 py-3 dark:bg-[#252528]">
            <span />
            <span />
            <span />
          </div>
        ) : null}
      </div>

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="flex shrink-0 items-center gap-2 border-t border-neutral-100 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-white/10"
      >
        <label htmlFor="glide-assistant-input" className="sr-only">
          Message Glide
        </label>
        <input
          ref={inputRef}
          id="glide-assistant-input"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Send $1 to Khadee at 0x…"
          disabled={busy}
          className="min-w-0 flex-1 rounded-full bg-neutral-100 px-4 py-3 text-[15px] font-medium text-neutral-950 placeholder:font-normal placeholder:text-neutral-400 focus:outline-none disabled:opacity-60 dark:bg-[#1c1c1e] dark:text-white dark:placeholder:text-white/35"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={busy || !message.trim()}
          className="glide-tap flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-white disabled:opacity-40"
          aria-label="Send"
        >
          <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
        </button>
      </form>
    </div>
  );
}
