const GROQ_API = "https://api.groq.com/openai/v1/chat/completions";

/** Default Groq model - fast, strong JSON for intents. Override with GROQ_MODEL. */
export const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";

export type GroqMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function groqChat(
  messages: GroqMessage[],
  options?: { json?: boolean },
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured on the server.");
  }

  const model = process.env.GROQ_MODEL?.trim() || DEFAULT_GROQ_MODEL;

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
