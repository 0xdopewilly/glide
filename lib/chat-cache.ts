export type ActionSuccessType = "send" | "swap" | "bridge";

export type StoredChatMessage = {
  id: string;
  role: "user" | "assistant";
  kind: "text" | "action_success" | "send_success" | "add_contact";
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

export function writeChatHistory(
  messages: StoredChatMessage[],
  userId?: string | null,
): void {
  if (typeof window === "undefined" || !userId) return;
  localStorage.setItem(key(userId), JSON.stringify(messages.slice(-80)));
}
