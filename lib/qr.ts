/** Extract wallet address from QR text (plain address or ethereum: URI). */
export function parseQrAddress(raw: string): string {
  const payload = parseQrPayload(raw);
  if (payload?.type === "address") return payload.address;
  if (payload?.type === "send") return payload.to;
  return "";
}

export type QrPayload =
  | { type: "address"; address: string }
  | { type: "send"; to: string; amount?: string; note?: string }
  | { type: "request"; code: string };

/** Parse wallet address, Glide send deep link, or payment request link. */
export function parseQrPayload(raw: string): QrPayload | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      const url = new URL(trimmed);
      const payMatch = url.pathname.match(/\/pay\/([a-z0-9]+)/i);
      if (payMatch?.[1]) {
        return { type: "request", code: payMatch[1].toLowerCase() };
      }
      const to = url.searchParams.get("to");
      if (to) {
        return {
          type: "send",
          to: decodeURIComponent(to),
          amount: url.searchParams.get("amount") ?? undefined,
          note: url.searchParams.get("note") ?? undefined,
        };
      }
    }
  } catch {
    /* not a URL */
  }

  if (trimmed.startsWith("glide:")) {
    const path = trimmed.slice("glide:".length);
    if (path.startsWith("pay/")) {
      const code = path.slice(4).split("?")[0];
      if (code) return { type: "request", code: code.toLowerCase() };
    }
    if (path.startsWith("send?")) {
      const qs = path.includes("?") ? path.slice(path.indexOf("?") + 1) : "";
      const params = new URLSearchParams(qs);
      const to = params.get("to");
      if (to) {
        return {
          type: "send",
          to,
          amount: params.get("amount") ?? undefined,
          note: params.get("note") ?? undefined,
        };
      }
    }
  }

  if (trimmed.startsWith("ethereum:")) {
    const afterScheme = trimmed.slice("ethereum:".length);
    const addr = afterScheme.split("@")[0]?.split("?")[0]?.trim();
    if (addr) return { type: "address", address: addr };
  }

  if (/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
    return { type: "address", address: trimmed };
  }

  return null;
}
