export type ActionSuccessType = "send" | "swap" | "bridge";

export type ConfirmActionKind = "send" | "send_batch" | "request" | "split";

export type StoredChatMessage = {
  id: string;
  role: "user" | "assistant";
  kind:
    | "text"
    | "action_success"
    | "send_success"
    | "add_contact"
    | "confirm_action";
  text?: string;
  amount?: string;
  to?: string;
  recipientName?: string;
  walletAddress?: string;
  contactName?: string;
  contactSaved?: boolean;
  contactSkipped?: boolean;
  successAction?: ActionSuccessType;
  /** USDC or EURC for send success cards */
  token?: string;
  targetToken?: string;
  /** EURC received from swap (display with €) */
  receivedAmount?: string;
  network?: string;
  /** For confirm_action: the kind of action the user is being asked to confirm. */
  confirmKind?: ConfirmActionKind;
  /** For confirm_action send_batch: each leg's amount + token. */
  transfers?: { amount: string; token: string }[];
  /** For confirm_action split: equal-share recipients (usernames). */
  recipients?: string[];
  /** For confirm_action: was this confirmed, cancelled, or still pending. */
  confirmStatus?: "pending" | "confirmed" | "cancelled" | "failed";
  /** For confirm_action request: target user's glide tag. */
  glideTag?: string;
};

const WELCOME: StoredChatMessage = {
  id: "welcome",
  role: "assistant",
  kind: "text",
  text: "Hi! I'm Glide Assist - send, request, split bills, swap, or bridge. What do you need?",
};

function key(userId: string) {
  return `glide.chat.${userId}`;
}

function migrateMessage(msg: StoredChatMessage): StoredChatMessage {
  if (msg.kind === "send_success") {
    return {
      ...msg,
      kind: "action_success",
      successAction: "send",
    };
  }
  return msg;
}

function normalizeHistory(messages: StoredChatMessage[]): StoredChatMessage[] {
  if (!messages.length) return [WELCOME];
  const out = messages.map(migrateMessage);
  const welcome = out[0];
  if (
    welcome?.id === "welcome" &&
    (welcome.text?.includes("-") || welcome.text?.includes("–"))
  ) {
    out[0] = { ...WELCOME };
  }
  return out;
}

export function readChatHistory(userId?: string | null): StoredChatMessage[] {
  if (typeof window === "undefined" || !userId) return [WELCOME];
  try {
    const raw = localStorage.getItem(key(userId));
    if (!raw) return [WELCOME];
    const parsed = JSON.parse(raw) as StoredChatMessage[];
    if (!Array.isArray(parsed) || parsed.length === 0) return [WELCOME];
    return normalizeHistory(parsed);
  } catch {
    return [WELCOME];
  }
}

/** Keep at most this many messages in localStorage. Older messages are
 * dropped on write. Stops localStorage from growing unbounded over months
 * of usage, and keeps the JSON parse + render budget bounded. */
const MAX_CLIENT_HISTORY = 100;

export function writeChatHistory(
  messages: StoredChatMessage[],
  userId?: string | null,
): void {
  if (typeof window === "undefined" || !userId) return;
  localStorage.setItem(
    key(userId),
    JSON.stringify(messages.slice(-MAX_CLIENT_HISTORY)),
  );
}

/** Fetch server-side history. Server is the source of truth across devices. */
export async function fetchServerChatHistory(): Promise<
  StoredChatMessage[] | null
> {
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch("/api/chat-history", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { messages?: StoredChatMessage[] };
    if (!Array.isArray(data.messages) || data.messages.length === 0) return null;
    return normalizeHistory(data.messages);
  } catch {
    return null;
  }
}

/**
 * Snapshot the conversation to the server. Caller debounces.
 * AbortSignal lets the caller cancel in-flight writes when a newer one arrives.
 */
export async function pushServerChatHistory(
  messages: StoredChatMessage[],
  signal?: AbortSignal,
): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await fetch("/api/chat-history", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: messages.slice(-80) }),
      signal,
    });
  } catch {
    /* network blip — localStorage still has it, next change will retry */
  }
}
