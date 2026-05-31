const GROQ_API = "https://api.groq.com/openai/v1/chat/completions";

/** Default Groq model. Llama 3.1 8b-instant returns full JSON-mode intents in
 * ~400ms (vs ~2s for 70b) at parity quality for our structured-output use
 * case. Override with GROQ_MODEL env var if you need the bigger model. */
export const DEFAULT_GROQ_MODEL = "llama-3.1-8b-instant";

export type GroqMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function groqChat(
  messages: GroqMessage[],
  options?: { json?: boolean; model?: string },
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured on the server.");
  }

  const model = options?.model ?? process.env.GROQ_MODEL?.trim() ?? DEFAULT_GROQ_MODEL;

  const res = await fetch(GROQ_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      max_tokens: 512,
      ...(options?.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  };

  if (!res.ok) {
    throw new Error(data.error?.message ?? "Glide assistant is temporarily unavailable.");
  }

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Empty response from assistant.");
  return content;
}

/** Server-Sent Events stream of token deltas. Yields each chunk of the
 * model's output as it arrives. The chat client can render text live for
 * 'reply' intents while still buffering full JSON for action dispatch.
 *
 * NOTE: This isn't currently wired into /api/agent because the perceived
 * UX win at 400ms total latency is marginal vs the parsing complexity. Kept
 * here for future use (e.g. if we move to a slower / larger model). */
export async function* groqChatStream(
  messages: GroqMessage[],
  options?: { json?: boolean; model?: string },
): AsyncGenerator<string, void, void> {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured on the server.");
  }
  const model = options?.model ?? process.env.GROQ_MODEL?.trim() ?? DEFAULT_GROQ_MODEL;

  const res = await fetch(GROQ_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      max_tokens: 512,
      stream: true,
      ...(options?.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!res.ok || !res.body) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Groq stream failed: ${errBody || res.statusText}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newlineIndex;
    while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6);
      if (payload === "[DONE]") return;
      try {
        const parsed = JSON.parse(payload) as {
          choices?: { delta?: { content?: string } }[];
        };
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) yield delta;
      } catch {
        // ignore malformed SSE chunk
      }
    }
  }
}
