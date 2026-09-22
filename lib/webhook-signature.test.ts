import { generateKeyPairSync, createSign } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Circle signs webhooks with ECDSA_SHA_256 and serves the public key (base64
// DER/SPKI) by X-Circle-Key-Id. Stand in for that lookup with a local key pair.
const { publicKey, privateKey } = generateKeyPairSync("ec", {
  namedCurve: "prime256v1",
});
const publicKeyB64 = publicKey
  .export({ format: "der", type: "spki" })
  .toString("base64");

const getNotificationSignature = vi.fn();
vi.mock("@/lib/circle", () => ({
  createCircleClient: () => ({ client: { getNotificationSignature } }),
}));

const { verifyCircleWebhook } = await import("@/lib/webhook-signature");

const KEY_ID = "b3d9d2d5-4c12-4946-a09d-953e82fae2b0";
const body = JSON.stringify({
  notificationType: "transactions.inbound",
  notification: { amounts: ["20.00"], blockchain: "BASE" },
});

function sign(payload: string): string {
  const signer = createSign("SHA256");
  signer.update(payload);
  return signer.sign(privateKey, "base64");
}

describe("verifyCircleWebhook", () => {
  beforeEach(() => {
    getNotificationSignature.mockReset();
    getNotificationSignature.mockResolvedValue({
      data: { id: KEY_ID, algorithm: "ECDSA_SHA_256", publicKey: publicKeyB64 },
    });
  });

  it("accepts a correctly signed raw body", async () => {
    expect(await verifyCircleWebhook(body, sign(body), KEY_ID)).toBe(true);
  });

  it("rejects a body that was changed after signing", async () => {
    const forged = body.replace("20.00", "20000.00");
    expect(await verifyCircleWebhook(forged, sign(body), KEY_ID)).toBe(false);
  });

  it("rejects missing headers without looking up a key", async () => {
    expect(await verifyCircleWebhook(body, null, KEY_ID)).toBe(false);
    expect(await verifyCircleWebhook(body, sign(body), null)).toBe(false);
    expect(getNotificationSignature).not.toHaveBeenCalled();
  });

  it("rejects a malformed key id", async () => {
    expect(await verifyCircleWebhook(body, sign(body), "../../v1/wallets")).toBe(
      false,
    );
    expect(getNotificationSignature).not.toHaveBeenCalled();
  });

  it("fails closed when the key lookup errors", async () => {
    getNotificationSignature.mockRejectedValue(new Error("circle down"));
    const otherKeyId = "c3d9d2d5-4c12-4946-a09d-953e82fae2b0";
    expect(await verifyCircleWebhook(body, sign(body), otherKeyId)).toBe(false);
  });

  it("rejects a signature made with a different key", async () => {
    const other = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
    const signer = createSign("SHA256");
    signer.update(body);
    const foreign = signer.sign(other.privateKey, "base64");
    expect(await verifyCircleWebhook(body, foreign, KEY_ID)).toBe(false);
  });
});
