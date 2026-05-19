const KIT_KEY_PATTERN = /^KIT_KEY:[a-zA-Z0-9._-]+:[a-zA-Z0-9._-]+$/;

export type KitKeyStatus = {
  ok: boolean;
  hint?: string;
  /** Where the key was read from (for debugging deploy). */
  source?: "CIRCLE_KIT_KEY" | "KIT_KEY" | "none";
  /** First segment only, e.g. KIT_KEY — never includes secrets. */
  prefix?: string;
  circleApiKeySet: boolean;
  circleEntitySecretSet: boolean;
};

/**
 * Resolve Circle App Kit / Stablecoin Service key from env.
 * Must be a Kit Key (KIT_KEY:id:secret), not CIRCLE_API_KEY (TEST_API_KEY:...).
 * @see https://developers.circle.com/w3s/keys#kit-keys
 */
export function resolveKitKey(): string {
  const status = kitKeyStatus();
  if (!status.ok) {
    throw new Error(status.hint ?? "Invalid CIRCLE_KIT_KEY");
  }
  return readRawKitKey()!;
}

function readRawKitKey(): string | null {
  const fromCircle = process.env.CIRCLE_KIT_KEY?.trim();
  if (fromCircle) return fromCircle;
  const fromKit = process.env.KIT_KEY?.trim();
  if (fromKit) return fromKit;
  return null;
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
        "Missing CIRCLE_KIT_KEY. Add it in .env.local for local dev, or Vercel → Settings → Environment Variables (Production), then redeploy.",
    };
  }

  const source = process.env.CIRCLE_KIT_KEY?.trim()
    ? "CIRCLE_KIT_KEY"
    : "KIT_KEY";

  if (raw.startsWith("TEST_API_KEY:") || raw.startsWith("LIVE_API_KEY:")) {
    return {
      ok: false,
      source,
      prefix: raw.split(":")[0],
      circleApiKeySet,
      circleEntitySecretSet,
      hint:
        "CIRCLE_KIT_KEY must be a Kit Key (KIT_KEY:keyId:keySecret), not your Developer API key (TEST_API_KEY:...). Create one under Circle Console → Keys → Kit keys.",
    };
  }

  if (KIT_KEY_PATTERN.test(raw)) {
    return { ok: true, source, prefix: "KIT_KEY", circleApiKeySet, circleEntitySecretSet };
  }

  const parts = raw.split(":");
  if (parts.length === 2 && parts[0] && parts[1]) {
    const normalized = `KIT_KEY:${parts[0]}:${parts[1]}`;
    if (KIT_KEY_PATTERN.test(normalized)) {
      return { ok: true, source, prefix: "KIT_KEY", circleApiKeySet, circleEntitySecretSet };
    }
  }

  return {
    ok: false,
    source,
    prefix: raw.split(":")[0] || undefined,
    circleApiKeySet,
    circleEntitySecretSet,
    hint:
      "CIRCLE_KIT_KEY has invalid format. Use the full value from Circle Console: KIT_KEY:<keyId>:<keySecret>",
  };
}

/** @deprecated use kitKeyStatus */
export function kitKeyHealth(): { ok: boolean; hint?: string } {
  const s = kitKeyStatus();
  return { ok: s.ok, hint: s.hint };
}
