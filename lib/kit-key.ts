const KIT_KEY_PATTERN = /^KIT_KEY:[a-zA-Z0-9._-]+:[a-zA-Z0-9._-]+$/;

/**
 * Resolve Circle App Kit / Stablecoin Service key from env.
 * Must be a Kit Key (KIT_KEY:id:secret), not CIRCLE_API_KEY (TEST_API_KEY:...).
 * @see https://developers.circle.com/w3s/keys#kit-keys
 */
export function resolveKitKey(): string {
  const raw =
    process.env.CIRCLE_KIT_KEY?.trim() || process.env.KIT_KEY?.trim() || "";

  if (!raw) {
    throw new Error(
      "Missing CIRCLE_KIT_KEY. Create a Kit Key at https://developers.circle.com/w3s/keys#kit-keys and add it to Vercel env vars.",
    );
  }

  if (raw.startsWith("TEST_API_KEY:") || raw.startsWith("LIVE_API_KEY:")) {
    throw new Error(
      "CIRCLE_KIT_KEY must be a Kit Key (KIT_KEY:keyId:keySecret), not your Developer-Controlled Wallets API key (TEST_API_KEY:...). Create a Kit Key under Console → Keys → Kit keys.",
    );
  }

  if (KIT_KEY_PATTERN.test(raw)) {
    return raw;
  }

  // Allow keyId:keySecret if user omitted the KIT_KEY: prefix
  const parts = raw.split(":");
  if (parts.length === 2 && parts[0] && parts[1]) {
    const normalized = `KIT_KEY:${parts[0]}:${parts[1]}`;
    if (KIT_KEY_PATTERN.test(normalized)) {
      return normalized;
    }
  }

  throw new Error(
    "CIRCLE_KIT_KEY has invalid format. Use the full Kit Key from Circle Console: KIT_KEY:<keyId>:<keySecret>",
  );
}

/** Safe check for health endpoint — never returns the secret. */
export function kitKeyHealth(): { ok: boolean; hint?: string } {
  try {
    resolveKitKey();
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      hint: err instanceof Error ? err.message : "Invalid CIRCLE_KIT_KEY",
    };
  }
}
