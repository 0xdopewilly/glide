"use client";

import type { GlideIntent } from "@/lib/agent-intents";
import { useWallet } from "@/context/wallet-context";
import { ArrowUp, Sparkles, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
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

const FULL_BLEED_ROUTES = ["/send", "/receive", "/swap", "/bridge"];

export function GlideAssistant() {
  const router = useRouter();
  const pathname = usePathname();
  const { sendMoney, swapMoney, bridgeMoney, refresh, clearError } = useWallet();
  const [expanded, setExpanded] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasNav = !FULL_BLEED_ROUTES.some((r) => pathname.startsWith(r));

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

  const open = () => {
    setExpanded(true);
    window.setTimeout(() => inputRef.current?.focus(), 200);
  };

  const close = () => setExpanded(false);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  return (
    <div
      className={`pointer-events-none absolute inset-x-0 z-40 flex justify-end px-4 ${
        hasNav
          ? "bottom-[calc(4.75rem+env(safe-area-inset-bottom))]"
          : "bottom-[max(1rem,env(safe-area-inset-bottom))]"
      }`}
    >
      {expanded ? (
        <div
          role="dialog"
          aria-label="Glide assistant"
          className="glide-assistant-panel pointer-events-auto flex w-full max-w-[min(100%,340px)] flex-col overflow-hidden rounded-3xl border border-neutral-200/90 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.18)] dark:border-white/10 dark:bg-[#141416] dark:shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
        >
          <header className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 dark:border-white/10">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold tracking-tight">Glide</p>
                <p className="text-[11px] glide-muted">llama-3.3-70b</p>
              </div>
            </div>
            <button
              type="button"
              onClick={close}
              className="glide-tap flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 dark:bg-[#1c1c1e] dark:text-white/70"
              aria-label="Close assistant"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div
            ref={listRef}
            className="glide-scroll max-h-[min(42vh,320px)] min-h-[120px] space-y-2 overflow-y-auto overscroll-contain px-3 py-3"
          >
            {messages.map((m) => (
              <div
                key={m.id}
                className={`text-[14px] leading-snug ${
                  m.role === "user"
                    ? "ml-6 rounded-2xl rounded-br-md bg-neutral-950 px-3 py-2 text-white dark:bg-white dark:text-neutral-950"
                    : "mr-4 rounded-2xl rounded-bl-md bg-neutral-100 px-3 py-2 text-neutral-900 dark:bg-[#1c1c1e] dark:text-white/90"
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
            className="flex items-center gap-2 border-t border-neutral-100 px-3 py-3 dark:border-white/10"
          >
            <label htmlFor="glide-assistant-input" className="sr-only">
              Message Glide
            </label>
            <input
              ref={inputRef}
              id="glide-assistant-input"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Send, swap, bridge…"
              disabled={busy}
              className="min-w-0 flex-1 rounded-full bg-neutral-100 px-4 py-2.5 text-[15px] font-medium text-neutral-950 placeholder:font-normal placeholder:text-neutral-400 focus:outline-none disabled:opacity-60 dark:bg-[#1c1c1e] dark:text-white dark:placeholder:text-white/35"
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={busy || !message.trim()}
              className="glide-tap flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-white disabled:opacity-40 dark:bg-white dark:text-[#0a0a0a]"
              aria-label="Send"
            >
              <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
            </button>
          </form>
        </div>
      ) : (
        <button
          type="button"
          onClick={open}
          className="glide-assistant-fab glide-tap pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-[0_8px_28px_rgba(99,102,241,0.45)] ring-2 ring-white/20 dark:ring-white/10"
          aria-label="Open Glide assistant"
        >
          <Sparkles className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}
