const KIT_KEY_PATTERN = /^KIT_KEY:[a-zA-Z0-9._-]+:[a-zA-Z0-9._-]+$/;

export type KitKeyStatus = {
  ok: boolean;
  hint?: string;
  source?: "CIRCLE_KIT_KEY" | "KIT_KEY" | "STABLECOIN_KIT_API_KEY" | "none";
  prefix?: string;
  circleApiKeySet: boolean;
  circleEntitySecretSet: boolean;
};

function readRawKitKey(): string | null {
  const keys = [
    process.env.CIRCLE_KIT_KEY,
    process.env.KIT_KEY,
    process.env.STABLECOIN_KIT_API_KEY,
  ];
  for (const k of keys) {
    const trimmed = k?.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

function normalizeKitKey(raw: string): string | null {
  if (KIT_KEY_PATTERN.test(raw)) return raw;
  const parts = raw.split(":");
  if (parts.length === 2 && parts[0] && parts[1]) {
    const normalized = `KIT_KEY:${parts[0]}:${parts[1]}`;
    if (KIT_KEY_PATTERN.test(normalized)) return normalized;
  }
  return null;
}

/**
 * Resolved kit key always in KIT_KEY:id:secret form for App Kit.
 */
export function resolveKitKey(): string {
  const status = kitKeyStatus();
  if (!status.ok) {
    throw new Error(status.hint ?? "Invalid CIRCLE_KIT_KEY");
  }
  const normalized = normalizeKitKey(readRawKitKey()!);
  if (!normalized) {
    throw new Error(
      "CIRCLE_KIT_KEY has invalid format. Use KIT_KEY:<keyId>:<keySecret> from Circle Console.",
    );
  }
  return normalized;
}

export function kitKeyStatus(): KitKeyStatus {
  const circleApiKeySet = Boolean(process.env.CIRCLE_API_KEY?.trim());
  const circleEntitySecretSet = Boolean(process.env.CIRCLE_ENTITY_SECRET?.trim());

  const raw = readRawKitKey();
  if (!raw) {
    return {
      ok: false,
      source: "none",
      circleApiKeySet,
      circleEntitySecretSet,
      hint:
        "Missing CIRCLE_KIT_KEY. Add it in .env.local (local) or Vercel Production env vars, then redeploy.",
    };
  }

  const source = process.env.CIRCLE_KIT_KEY?.trim()
    ? "CIRCLE_KIT_KEY"
    : process.env.KIT_KEY?.trim()
      ? "KIT_KEY"
      : "STABLECOIN_KIT_API_KEY";

  if (raw.startsWith("TEST_API_KEY:") || raw.startsWith("LIVE_API_KEY:")) {
    return {
      ok: false,
      source,
      prefix: raw.split(":")[0],
      circleApiKeySet,
      circleEntitySecretSet,
      hint:
        "CIRCLE_KIT_KEY must be a Kit Key (KIT_KEY:keyId:keySecret), not your Developer API key (TEST_API_KEY:...).",
    };
  }

  if (normalizeKitKey(raw)) {
    return { ok: true, source, prefix: "KIT_KEY", circleApiKeySet, circleEntitySecretSet };
  }

  return {
    ok: false,
    source,
    prefix: raw.split(":")[0] || undefined,
    circleApiKeySet,
    circleEntitySecretSet,
    hint:
      "CIRCLE_KIT_KEY has invalid format. Paste the full Kit Key from Circle Console: KIT_KEY:<keyId>:<keySecret>",
  };
}

/** @deprecated use kitKeyStatus */
export function kitKeyHealth(): { ok: boolean; hint?: string } {
  const s = kitKeyStatus();
  return { ok: s.ok, hint: s.hint };
}
