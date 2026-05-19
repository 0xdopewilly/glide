"use client";

import type { GlideIntent } from "@/lib/agent-intents";
import { useWallet } from "@/context/wallet-context";
import { ArrowUp, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useRef, useState } from "react";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

export function ChatBar() {
  const router = useRouter();
  const { sendMoney, swapMoney, bridgeMoney, refresh, clearError } = useWallet();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Hi — I can send, swap, bridge, or open scan. What do you need?",
    },
  ]);
  const listRef = useRef<HTMLDivElement>(null);

  const append = useCallback((role: ChatMessage["role"], text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, role, text },
    ]);
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
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
          append("assistant", "Swap didn't complete. Check the error above.");
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
    setOpen(true);
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

  return (
    <div className="shrink-0 border-t border-neutral-200/80 bg-white/90 px-4 pb-3 pt-2 backdrop-blur-md dark:border-white/10 dark:bg-black/80">
      {open ? (
        <div
          ref={listRef}
          className="glide-scroll mb-2 max-h-40 space-y-2 overflow-y-auto overscroll-contain pr-1"
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
            <p className="text-xs glide-muted animate-pulse">Thinking…</p>
          ) : null}
        </div>
      ) : null}

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="flex items-center gap-2 rounded-full bg-neutral-100 py-1.5 pl-4 pr-1.5 dark:bg-[#1c1c1e]"
      >
        <Sparkles className="h-4 w-4 shrink-0 text-violet-500 dark:text-violet-400" aria-hidden />
        <label htmlFor="glide-chat" className="sr-only">
          Ask Glide
        </label>
        <input
          id="glide-chat"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Ask Glide to send, swap, or bridge"
          disabled={busy}
          className="min-w-0 flex-1 bg-transparent py-2.5 text-[15px] font-medium tracking-tight text-neutral-950 placeholder:font-normal placeholder:text-neutral-400 focus:outline-none disabled:opacity-60 dark:text-white dark:placeholder:text-white/35"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={busy || !message.trim()}
          className="glide-tap flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-white disabled:opacity-40 dark:bg-white dark:text-[#0a0a0a]"
          aria-label="Send message"
        >
          <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
        </button>
      </form>
    </div>
  );
}
