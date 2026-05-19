"use client";

import type { GlideIntent } from "@/lib/agent-intents";
import { useWallet } from "@/context/wallet-context";
import { ArrowUp, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

const WELCOME: ChatMessage = {
  id: "welcome",
  role: "assistant",
  text: "Hi — I can send, swap, bridge, or open scan. What do you need?",
};

export function GlideAssistantChat({ variant = "page" }: { variant?: "page" }) {
  const router = useRouter();
  const { sendMoney, swapMoney, bridgeMoney, refresh, clearError } = useWallet();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isPage = variant === "page";

  const append = useCallback((role: ChatMessage["role"], text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, role, text },
    ]);
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  }, []);

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
          append("assistant", `Sent $${intent.amount}.`);
          await refresh();
        } else {
          append("assistant", "Send didn't go through. Check your balance and try again.");
        }
        return;
      }
      if (intent.action === "swap") {
        const ok = await swapMoney(intent.amount);
        if (ok) {
          append("assistant", `Swapped $${intent.amount} to EURC.`);
          await refresh();
        } else {
          append("assistant", "Swap didn't complete. Check the error banner on screen.");
        }
        return;
      }
      if (intent.action === "bridge") {
        const ok = await bridgeMoney(intent.amount, intent.network);
        if (ok) {
          append("assistant", `Bridge started for $${intent.amount}.`);
          await refresh();
        } else {
          append("assistant", "Bridge didn't complete. Try again in a moment.");
        }
      }
    },
    [append, bridgeMoney, clearError, refresh, router, sendMoney, swapMoney],
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const text = message.trim();
    if (!text || busy) return;

    setMessage("");
    append("user", text);
    setBusy(true);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = (await res.json()) as {
        reply?: string;
        intent?: GlideIntent;
        error?: string;
      };

      if (!res.ok) {
        append("assistant", data.error ?? data.reply ?? "Something went wrong.");
        return;
      }

      append("assistant", data.reply ?? "Done.");
      if (data.intent && data.intent.action !== "reply") {
        await runIntent(data.intent);
      }
    } catch {
      append("assistant", "Couldn't reach Glide assistant. Try again.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (isPage) inputRef.current?.focus();
  }, [isPage]);

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
        className={`glide-scroll flex-1 space-y-2 overflow-y-auto overscroll-contain px-4 py-3 ${
          isPage ? "min-h-0" : "max-h-[min(42vh,320px)] min-h-[120px]"
        }`}
      >
        {messages.map((m) => (
          <div
            key={m.id}
            className={`text-[14px] leading-snug ${
              m.role === "user"
                ? "ml-8 rounded-2xl rounded-br-md bg-neutral-950 px-3 py-2 text-white dark:bg-white dark:text-neutral-950"
                : "mr-6 rounded-2xl rounded-bl-md bg-neutral-100 px-3 py-2 text-neutral-900 dark:bg-[#1c1c1e] dark:text-white/90"
            }`}
          >
            {m.text}
          </div>
        ))}
        {busy ? (
          <p className="text-xs glide-muted animate-pulse px-1">Thinking…</p>
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
          placeholder="Send $10 to 0x… or swap $5"
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
