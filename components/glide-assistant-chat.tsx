"use client";

import { ChatMessageBubble } from "@/components/chat/chat-message";
import {
  ProcessingBubble,
  type ProcessingAction,
} from "@/components/chat/processing-bubble";
import type { GlideIntent } from "@/lib/agent-intents";
import { formatStableAmountWithCode } from "@/lib/currency-format";
import {
  computeSplitSharePerPerson,
  formatSplitPartialMessage,
  formatSplitSuccessMessage,
} from "@/lib/split-bill";
import type { ActionSuccessType } from "@/lib/chat-cache";
import {
  fetchServerChatHistory,
  pushServerChatHistory,
  readChatHistory,
  writeChatHistory,
  type StoredChatMessage,
} from "@/lib/chat-cache";
import { useAuth } from "@/context/auth-context";
import { useWallet } from "@/context/wallet-context";
import { ArrowUp, Sparkles } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const WELCOME: StoredChatMessage = {
  id: "welcome",
  role: "assistant",
  kind: "text",
  text: "Hi! I'm Billy. Send, request, split bills, swap, or bridge. What do you need?",
};

type QuickPrompt = string;

const BASE_PROMPTS: QuickPrompt[] = [
  "Send $5",
  "Swap $10 to EURC",
  "Split $60 with @fifi and @khadee",
  "My balance",
];

/** Pick quick-suggestion chips based on what the user actually has. Avoids
 * showing "Swap $10 to EURC" to a user with $0 USDC, etc. Falls back to the
 * static set when state isn't loaded yet. */
function selectQuickPrompts(opts: {
  balance: number;
  hasEurc: boolean;
}): QuickPrompt[] {
  const out: QuickPrompt[] = [];
  if (opts.balance >= 1) out.push("Send $1");
  if (opts.balance >= 5) out.push("Swap $5 to EURC");
  if (opts.hasEurc) out.push("Bridge $5 to Base");
  out.push("How does Universal Receive work?");
  if (out.length < 3) out.push(...BASE_PROMPTS);
  return Array.from(new Set(out)).slice(0, 4);
}

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
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const {
    sendMoney,
    swapMoney,
    bridgeMoney,
    refresh,
    clearError,
    balance,
    tokens,
  } = useWallet();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [processingAction, setProcessingAction] =
    useState<ProcessingAction | null>(null);
  const [savingContactId, setSavingContactId] = useState<string | null>(null);
  const [messages, setMessages] = useState<StoredChatMessage[]>([WELCOME]);
  const [hydrated, setHydrated] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isPage = variant === "page";
  const userId = user?.id;

  const quickPrompts = useMemo(() => {
    const hasEurc = !!tokens.find(
      (t) => t.symbol?.toUpperCase() === "EURC" && t.amount > 0,
    );
    return selectQuickPrompts({ balance: balance ?? 0, hasEurc });
  }, [balance, tokens]);

  useEffect(() => {
    if (!userId) return;
    // Paint instantly from localStorage so the screen isn't blank, then ask
    // the server for the canonical cross-device history and reconcile.
    setMessages(readChatHistory(userId));
    setHydrated(true);

    let cancelled = false;
    void fetchServerChatHistory().then((serverHistory) => {
      if (cancelled || !serverHistory) return;
      setMessages(serverHistory);
      writeChatHistory(serverHistory, userId);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    const q = searchParams.get("q")?.trim();
    if (!q || !hydrated) return;
    setMessage(q);
    inputRef.current?.focus();
  }, [searchParams, hydrated]);

  const pendingSyncRef = useRef<AbortController | null>(null);
  const pendingTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!hydrated || !userId) return;
    writeChatHistory(messages, userId);

    // Debounce server sync so a burst of rapid setMessages calls only sends
    // one PUT. Cancel any in-flight write whose payload is now stale.
    if (pendingTimerRef.current !== null) {
      window.clearTimeout(pendingTimerRef.current);
    }
    pendingTimerRef.current = window.setTimeout(() => {
      pendingSyncRef.current?.abort();
      const controller = new AbortController();
      pendingSyncRef.current = controller;
      void pushServerChatHistory(messages, controller.signal);
    }, 600);

    return () => {
      if (pendingTimerRef.current !== null) {
        window.clearTimeout(pendingTimerRef.current);
        pendingTimerRef.current = null;
      }
    };
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

  // Build a confirm_action card for the four intents that move money OUT of
  // the user's wallet. swap + bridge are user-to-self transfers and execute
  // directly. Everything else goes through a [Confirm] / [Cancel] step so a
  // hallucinated LLM intent can never auto-spend.
  const buildConfirmCard = useCallback(
    (intent: GlideIntent): StoredChatMessage | null => {
      const base = {
        id: `confirm-${Date.now()}`,
        role: "assistant" as const,
        kind: "confirm_action" as const,
        confirmStatus: "pending" as const,
      };
      if (intent.action === "send") {
        return {
          ...base,
          confirmKind: "send",
          amount: intent.amount,
          token: intent.token ?? "USDC",
          to: intent.to,
          recipientName: intent.recipientName,
        };
      }
      if (intent.action === "send_batch") {
        return {
          ...base,
          confirmKind: "send_batch",
          to: intent.to,
          recipientName: intent.recipientName,
          transfers: intent.transfers,
        };
      }
      if (intent.action === "request") {
        return {
          ...base,
          confirmKind: "request",
          amount: intent.amount,
          token: intent.token ?? "USDC",
          glideTag: intent.glideTag,
        };
      }
      if (intent.action === "split") {
        return {
          ...base,
          confirmKind: "split",
          amount: intent.total,
          token: intent.token ?? "USDC",
          recipients: intent.recipients,
        };
      }
      return null;
    },
    [],
  );

  // Latest pending intent, keyed by the confirm card's id. When the user taps
  // Confirm we look this up and execute, then mark the card as confirmed.
  const pendingIntentsRef = useRef<Map<string, GlideIntent>>(new Map());

  const runIntent = useCallback(
    async (intent: GlideIntent, opts?: { viaConfirm?: boolean }) => {
      clearError();
      if (intent.action === "navigate") {
        router.push(intent.path);
        return;
      }

      // Money-out actions go through a confirmation card first. The
      // viaConfirm flag skips this gate — set when the user taps Confirm
      // on a confirm_action card so we proceed straight to execution.
      if (
        !opts?.viaConfirm &&
        (intent.action === "send" ||
          intent.action === "send_batch" ||
          intent.action === "request" ||
          intent.action === "split")
      ) {
        const card = buildConfirmCard(intent);
        if (card) {
          pendingIntentsRef.current.set(card.id, intent);
          pushMessage(card);
          return;
        }
      }

      const processing: ProcessingAction | null =
        intent.action === "send" ||
        intent.action === "send_batch" ||
        intent.action === "swap" ||
        intent.action === "bridge" ||
        intent.action === "request" ||
        intent.action === "split"
          ? intent.action === "send_batch"
            ? "send"
            : intent.action === "split" || intent.action === "request"
              ? "request"
              : intent.action
          : null;
      if (processing) setProcessingAction(processing);

      try {
      if (intent.action === "send_batch") {
        const label = intent.recipientName?.trim();
        let completed = 0;
        let lastError: string | null = null;
        for (const transfer of intent.transfers) {
          const result = await sendMoney(intent.to, transfer.amount, {
            token: transfer.token,
          });
          if (!result.ok) {
            lastError = result.error;
            break;
          }
          completed++;
          if (completed === intent.transfers.length) {
            setProcessingAction(null);
          }
          pushMessage({
            id: `success-${Date.now()}-${transfer.token}`,
            role: "assistant",
            kind: "action_success",
            successAction: "send",
            amount: transfer.amount,
            token: transfer.token,
            to: intent.to,
            recipientName: label,
          });
        }
        if (completed === intent.transfers.length) {
          try {
            const displayName = label ?? "Contact";
            const params = new URLSearchParams({
              wallet: intent.to,
              name: displayName,
            });
            const check = await fetch(`/api/contacts/exists?${params}`);
            const data = (await check.json()) as { exists?: boolean };
            if (!data.exists) {
              pushMessage({
                id: `contact-${Date.now()}`,
                role: "assistant",
                kind: "add_contact",
                contactName: displayName,
                walletAddress: intent.to,
                contactSaved: false,
              });
            }
          } catch {
            /* skip */
          }
          void refresh();
        } else if (completed > 0) {
          pushMessage({
            id: `partial-${Date.now()}`,
            role: "assistant",
            kind: "text",
            text: `Sent ${completed} of ${intent.transfers.length} payments. The rest failed: ${lastError ?? "unknown error"}.`,
          });
          void refresh();
        } else {
          pushMessage({
            id: `err-${Date.now()}`,
            role: "assistant",
            kind: "text",
            text: lastError
              ? `Send didn't go through: ${lastError}`
              : "Send didn't go through. Check your balance and try again.",
          });
        }
        return;
      }
      if (intent.action === "send") {
        const result = await sendMoney(intent.to, intent.amount, {
          token: intent.token ?? "USDC",
        });
        if (result.ok) {
          const label = intent.recipientName?.trim();
          const token = intent.token ?? "USDC";
          setProcessingAction(null);
          pushMessage({
            id: `success-${Date.now()}`,
            role: "assistant",
            kind: "action_success",
            successAction: "send",
            amount: intent.amount,
            token,
            to: intent.to,
            recipientName: label,
          });
          const displayName = label ?? "Contact";
          try {
            const params = new URLSearchParams({
              wallet: intent.to,
              name: displayName,
            });
            const check = await fetch(`/api/contacts/exists?${params}`);
            const data = (await check.json()) as { exists?: boolean };
            if (!data.exists) {
              pushMessage({
                id: `contact-${Date.now()}`,
                role: "assistant",
                kind: "add_contact",
                contactName: displayName,
                walletAddress: intent.to,
                contactSaved: false,
              });
            }
          } catch {
            /* skip prompt if lookup fails */
          }
          void refresh();
        } else {
          pushMessage({
            id: `err-${Date.now()}`,
            role: "assistant",
            kind: "text",
            text: `Send didn't go through: ${result.error}`,
          });
        }
        return;
      }
      if (intent.action === "swap") {
        const result = await swapMoney(intent.amount);
        setProcessingAction(null);
        if (result.ok) {
          pushMessage({
            id: `swap-${Date.now()}`,
            role: "assistant",
            kind: "action_success",
            successAction: "swap",
            amount: intent.amount,
            receivedAmount: result.receivedAmount,
            targetToken: "EURC",
          });
        } else {
          pushMessage({
            id: `swap-err-${Date.now()}`,
            role: "assistant",
            kind: "text",
            text: `Swap didn't complete: ${result.error}`,
          });
        }
        return;
      }
      if (intent.action === "bridge") {
        const result = await bridgeMoney(intent.amount, intent.network);
        setProcessingAction(null);
        if (result.ok) {
          pushMessage({
            id: `bridge-${Date.now()}`,
            role: "assistant",
            kind: "action_success",
            successAction: "bridge",
            amount: intent.amount,
            network: intent.network,
          });
        } else {
          pushMessage({
            id: `bridge-err-${Date.now()}`,
            role: "assistant",
            kind: "text",
            text: `Bridge didn't complete: ${result.error}`,
          });
        }
        return;
      }
      if (intent.action === "request") {
        try {
          const res = await fetch("/api/request", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              amount: intent.amount,
              token: intent.token ?? "USDC",
              glideTag: intent.glideTag,
              note: intent.note,
            }),
          });
          const data = (await res.json()) as { error?: string; targetOnGlide?: boolean };
          if (res.ok) {
            pushMessage({
              id: `req-${Date.now()}`,
              role: "assistant",
              kind: "text",
              text: `Requested ${formatStableAmountWithCode(intent.amount, intent.token ?? "USDC")} from @${intent.glideTag}.${data.targetOnGlide ? " They'll get a notification." : ""}`,
            });
          } else {
            pushMessage({
              id: `req-err-${Date.now()}`,
              role: "assistant",
              kind: "text",
              text: data.error ?? "Could not send that request.",
            });
          }
        } catch {
          pushMessage({
            id: `req-err-${Date.now()}`,
            role: "assistant",
            kind: "text",
            text: "Could not send that request. Try again.",
          });
        }
        return;
      }
      if (intent.action === "split") {
        const total = parseFloat(intent.total);
        const token = intent.token ?? "USDC";
        const share = computeSplitSharePerPerson(
          total,
          intent.recipients.length,
        );
        const note = `Your share of a ${formatStableAmountWithCode(intent.total, token)} bill`;
        let requested = 0;
        const failures: string[] = [];

        for (const glideTag of intent.recipients) {
          try {
            const res = await fetch("/api/request", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ amount: share, glideTag, note, token }),
            });
            const data = (await res.json()) as { error?: string };
            if (res.ok) {
              requested++;
            } else {
              failures.push(
                `@${glideTag}: ${data.error ?? "could not request"}`,
              );
            }
          } catch {
            failures.push(`@${glideTag}: request failed`);
          }
        }

        if (requested === intent.recipients.length) {
          pushMessage({
            id: `split-${Date.now()}`,
            role: "assistant",
            kind: "text",
            text: formatSplitSuccessMessage(
              intent.total,
              share,
              intent.recipients,
              token,
            ),
          });
        } else if (requested > 0) {
          pushMessage({
            id: `split-partial-${Date.now()}`,
            role: "assistant",
            kind: "text",
            text: formatSplitPartialMessage(
              requested,
              intent.recipients.length,
              share,
              token,
            ),
          });
          if (failures.length > 0) {
            pushMessage({
              id: `split-fail-${Date.now()}`,
              role: "assistant",
              kind: "text",
              text: failures.join(" "),
            });
          }
        } else {
          pushMessage({
            id: `split-err-${Date.now()}`,
            role: "assistant",
            kind: "text",
            text:
              failures[0] ??
              "Could not create payment requests. Check tags and try Request.",
          });
        }
      }
      } finally {
        setProcessingAction(null);
      }
    },
    [bridgeMoney, clearError, pushMessage, refresh, router, sendMoney, swapMoney],
  );

  const dismissPendingContactPrompts = useCallback(() => {
    setMessages((prev) =>
      prev.map((m) =>
        m.kind === "add_contact" && !m.contactSaved
          ? { ...m, contactSkipped: true }
          : m,
      ),
    );
  }, []);

  const onConfirmAction = useCallback(
    async (id: string) => {
      const pending = pendingIntentsRef.current.get(id);
      if (!pending) return;
      pendingIntentsRef.current.delete(id);
      // Mark the card so it loses its buttons and reads "Sent".
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id && m.kind === "confirm_action"
            ? { ...m, confirmStatus: "confirmed" as const }
            : m,
        ),
      );
      await runIntent(pending, { viaConfirm: true });
    },
    [runIntent],
  );

  const onCancelAction = useCallback((id: string) => {
    pendingIntentsRef.current.delete(id);
    setMessages((prev) =>
      prev.map((m) =>
        m.id === id && m.kind === "confirm_action"
          ? { ...m, confirmStatus: "cancelled" as const }
          : m,
      ),
    );
  }, []);

  const sendToAgent = useCallback(
    async (text: string) => {
      if (!text.trim() || busy) return;
      const trimmed = text.trim();

      if (/already in (my )?contacts?/i.test(trimmed)) {
        dismissPendingContactPrompts();
        pushMessage({
          id: `user-${Date.now()}`,
          role: "user",
          kind: "text",
          text: trimmed,
        });
        pushMessage({
          id: `asst-${Date.now()}`,
          role: "assistant",
          kind: "text",
          text: "Got it. They're already in your contacts.",
        });
        return;
      }

      pushMessage({
        id: `user-${Date.now()}`,
        role: "user",
        kind: "text",
        text: trimmed,
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
          action?: string;
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

        const intent =
          data.intent ??
          (typeof data.action === "string" && data.action !== "reply"
            ? (data as GlideIntent)
            : null);

        if (intent && intent.action !== "reply") {
          await runIntent(intent);
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
          text: "Couldn't reach Billy. Try again.",
        });
      } finally {
        setBusy(false);
      }
    },
    [busy, dismissPendingContactPrompts, messages, pushMessage, runIntent],
  );

  const skipContact = (messageId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId && m.kind === "add_contact"
          ? { ...m, contactSkipped: true }
          : m,
      ),
    );
  };

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
  }, [messages, processingAction, scrollToEnd]);

  return (
    <div
      className={
        isPage
          ? "flex min-h-0 flex-1 flex-col"
          : "flex w-full flex-col overflow-hidden rounded-3xl border"
      }
    >
      {isPage ? (
        <header className="shrink-0 px-5 pb-3 pt-4">
          <div className="flex items-center gap-3">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-2xl"
              style={{
                background: "var(--glide-accent)",
                color: "var(--glide-bg)",
              }}
            >
              <Sparkles className="h-[18px] w-[18px]" />
            </span>
            <div>
              <p className="text-base font-semibold tracking-tight">Billy</p>
              <p className="text-xs glide-muted">Send, swap, bridge. Just ask.</p>
            </div>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                disabled={busy}
                onClick={() => void sendToAgent(prompt)}
                className="glide-tap shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold"
                style={{
                  background: "var(--glide-surface-container)",
                  borderColor: "var(--glide-border)",
                  color: "var(--glide-text)",
                }}
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
            onSkipContact={skipContact}
            onConfirmAction={onConfirmAction}
            onCancelAction={onCancelAction}
            confirmBusy={busy}
          />
        ))}
        {processingAction ? (
          <ProcessingBubble action={processingAction} />
        ) : null}
        {busy && !processingAction ? (
          <div className="flex justify-start px-1 py-1">
            <div
              className="glide-chat-typing flex gap-1.5 rounded-[20px] rounded-bl-[6px] border px-4 py-3.5"
              style={{
                background: "var(--glide-surface-elevated)",
                borderColor: "var(--glide-border)",
              }}
            >
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
        <div
          className="flex items-center gap-2 rounded-[28px] border p-1.5"
          style={{
            background: "var(--glide-surface-elevated)",
            borderColor: "var(--glide-border)",
          }}
        >
          <label htmlFor="glide-assistant-input" className="sr-only">
            Message Billy
          </label>
          <input
            ref={inputRef}
            id="glide-assistant-input"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Message Billy…"
            disabled={busy}
            className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-[15px] font-medium placeholder:font-normal focus:outline-none disabled:opacity-60"
            style={{ color: "var(--glide-text)" }}
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={busy || !message.trim()}
            className="glide-tap flex h-11 w-11 shrink-0 items-center justify-center rounded-full disabled:opacity-40"
            style={{
              background: "var(--glide-accent)",
              color: "var(--glide-bg)",
            }}
            aria-label="Send"
          >
            <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </div>
      </form>
    </div>
  );
}
