/** Extract wallet address from QR text (plain address or ethereum: URI). */
export function parseQrAddress(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("ethereum:")) {
    const afterScheme = trimmed.slice("ethereum:".length);
    const addr = afterScheme.split("@")[0]?.split("?")[0]?.trim();
    return addr ?? trimmed;
  }

  return trimmed;
}
