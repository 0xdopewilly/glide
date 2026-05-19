export type StoredChatMessage = {
  id: string;
  role: "user" | "assistant";
  kind: "text" | "send_success" | "add_contact";
  text?: string;
  amount?: string;
  to?: string;
  recipientName?: string;
  walletAddress?: string;
  contactName?: string;
  contactSaved?: boolean;
};

const WELCOME: StoredChatMessage = {
  id: "welcome",
  role: "assistant",
  kind: "text",
  text: "Hi! I can send, swap, bridge, or open scan. What do you need?",
};

function key(userId: string) {
  return `glide.chat.${userId}`;
}

export function readChatHistory(userId?: string | null): StoredChatMessage[] {
  if (typeof window === "undefined" || !userId) return [WELCOME];
  try {
    const raw = localStorage.getItem(key(userId));
    if (!raw) return [WELCOME];
    const parsed = JSON.parse(raw) as StoredChatMessage[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [WELCOME];
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
