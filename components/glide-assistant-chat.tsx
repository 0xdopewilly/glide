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
  text: "Hi! I can send, swap, bridge, or open scan. What do you need?",
};

const QUICK_PROMPTS = [
  "Send $5",
  "Swap $10 to EURC",
  "Open scan",
  "My balance",
] as const;

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
            kind: "action_success",
            successAction: "send",
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
        if (ok) {
          pushMessage({
            id: `swap-${Date.now()}`,
            role: "assistant",
            kind: "action_success",
            successAction: "swap",
            amount: intent.amount,
            targetToken: "EURC",
          });
          await refresh();
        } else {
          pushMessage({
            id: `swap-err-${Date.now()}`,
            role: "assistant",
            kind: "text",
            text: "Swap didn't complete. Check the error banner on screen.",
          });
        }
        return;
      }
      if (intent.action === "bridge") {
        const ok = await bridgeMoney(intent.amount, intent.network);
        if (ok) {
          pushMessage({
            id: `bridge-${Date.now()}`,
            role: "assistant",
            kind: "action_success",
            successAction: "bridge",
            amount: intent.amount,
            network: intent.network,
          });
          await refresh();
        } else {
          pushMessage({
            id: `bridge-err-${Date.now()}`,
            role: "assistant",
            kind: "text",
            text: "Bridge didn't complete. Try again in a moment.",
          });
        }
      }
    },
    [bridgeMoney, clearError, pushMessage, refresh, router, sendMoney, swapMoney],
  );

  const sendToAgent = useCallback(
    async (text: string) => {
      if (!text.trim() || busy) return;
      pushMessage({
        id: `user-${Date.now()}`,
        role: "user",
        kind: "text",
        text: text.trim(),
      });
      setBusy(true);

      try {
        const history = toAgentHistory(messages);
        const res = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text.trim(), history }),
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
    },
    [busy, messages, pushMessage, runIntent],
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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const text = message.trim();
    if (!text) return;
    setMessage("");
    void sendToAgent(text);
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
          : "flex w-full flex-col overflow-hidden rounded-3xl border border-neutral-200/90 bg-white dark:border-white/10 dark:bg-[#141416]"
      }
    >
      {isPage ? (
        <header className="shrink-0 px-5 pb-3 pt-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-600 text-white">
              <Sparkles className="h-[18px] w-[18px]" />
            </span>
            <div>
              <p className="text-base font-semibold tracking-tight">Glide</p>
              <p className="text-xs glide-muted">Send, swap, bridge. Just ask.</p>
            </div>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                disabled={busy}
                onClick={() => void sendToAgent(prompt)}
                className="glide-tap shrink-0 rounded-full border border-neutral-200/80 bg-white/80 px-3 py-1.5 text-xs font-semibold text-neutral-700 backdrop-blur-sm dark:border-white/10 dark:bg-white/5 dark:text-white/75"
              >
                {prompt}
              </button>
            ))}
          </div>
        </header>
      ) : null}

      <div
        ref={listRef}
        className={`glide-scroll flex min-w-0 flex-1 flex-col gap-2 overflow-x-hidden overflow-y-auto overscroll-contain px-4 ${
          isPage ? "min-h-0 py-2" : "max-h-[min(42vh,320px)] min-h-[120px] py-3"
        }`}
      >
        {messages.map((m) => (
          <ChatMessageBubble
            key={m.id}
            message={m}
            savingContact={savingContactId === m.id}
            onSaveContact={saveContact}
          />
        ))}
        {busy ? (
          <div className="flex justify-start px-1 py-1">
            <div className="glide-chat-typing flex gap-1.5 rounded-[20px] rounded-bl-[6px] border border-neutral-200/50 bg-white/90 px-4 py-3.5 dark:border-white/[0.06] dark:bg-[#1e1e22]">
              <span />
              <span />
              <span />
            </div>
          </div>
        ) : null}
      </div>

      <form
        onSubmit={handleSubmit}
        className="shrink-0 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2"
      >
        <div className="flex items-center gap-2 rounded-[28px] border border-neutral-200/70 bg-white/90 p-1.5 dark:border-white/[0.08] dark:bg-[#1a1a1e]/95">
          <label htmlFor="glide-assistant-input" className="sr-only">
            Message Glide
          </label>
          <input
            ref={inputRef}
            id="glide-assistant-input"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Message Glide…"
            disabled={busy}
            className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-[15px] font-medium text-neutral-950 placeholder:font-normal placeholder:text-neutral-400 focus:outline-none disabled:opacity-60 dark:text-white dark:placeholder:text-white/35"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={busy || !message.trim()}
            className="glide-tap flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white disabled:opacity-40"
            aria-label="Send"
          >
            <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </div>
      </form>
    </div>
  );
}
