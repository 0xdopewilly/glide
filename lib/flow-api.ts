import type { GlideTransaction } from "@/lib/types";

export async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? "Request failed");
  }
  return data;
}

export type FlowSuccess = {
  ok: true;
  balance: number;
  transaction: GlideTransaction;
};
