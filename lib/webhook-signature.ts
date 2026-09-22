import { createPublicKey, createVerify, type KeyObject } from "node:crypto";
import { createCircleClient } from "@/lib/circle";

/** Circle signs every webhook notification with ECDSA_SHA_256. The signing
 * key's id arrives in X-Circle-Key-Id; the key for an id never changes, so
 * it's cached for the life of the function instance.
 * Ref: developers.circle.com/api-reference/verify-webhook-signatures */
const publicKeyCache = new Map<string, KeyObject>();

const KEY_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getCirclePublicKey(keyId: string): Promise<KeyObject | null> {
  const cached = publicKeyCache.get(keyId);
  if (cached) return cached;

  const initialized = createCircleClient();
  if ("error" in initialized) return null;

  // GET /v2/notifications/publicKey/{keyId} (the SDK names the param
  // subscriptionId, but it is the X-Circle-Key-Id value).
  const res = await initialized.client.getNotificationSignature(keyId);
  const encoded = res.data?.publicKey;
  if (!encoded) return null;

  const key = createPublicKey({
    key: Buffer.from(encoded, "base64"),
    format: "der",
    type: "spki",
  });
  publicKeyCache.set(keyId, key);
  return key;
}

/** Verify a Circle webhook against the RAW request body (parsed and
 * re-serialized JSON would not match). Fails closed: returns false on missing
 * headers, a malformed key id, an unknown key, a lookup error, or a bad
 * signature — callers must reject the request. */
export async function verifyCircleWebhook(
  rawBody: string,
  signature: string | null,
  keyId: string | null,
): Promise<boolean> {
  if (!signature || !keyId || !KEY_ID_PATTERN.test(keyId)) return false;
  try {
    const key = await getCirclePublicKey(keyId);
    if (!key) return false;
    const verifier = createVerify("SHA256");
    verifier.update(rawBody);
    return verifier.verify(key, signature, "base64");
  } catch (err) {
    console.error("[Glide] webhook signature check:", err);
    return false;
  }
}
