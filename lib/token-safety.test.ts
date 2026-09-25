import { describe, expect, it } from "vitest";
import { isSuspiciousToken, sanitizeTokenText } from "@/lib/token-safety";

// Unverified token names are written by whoever deployed the token. They must
// be cleaned before display, and fakes of real Circle tokens must be flagged
// (hidden, never offered for sending) — identity is the contract address.
describe("sanitizeTokenText", () => {
  it("strips invisible and bidi-override characters", () => {
    expect(sanitizeTokenText("PE​PE", 12)).toBe("PEPE");
    expect(sanitizeTokenText("‮CDSU", 12)).toBe("CDSU");
    expect(sanitizeTokenText("A\u0000B\u0007C", 12)).toBe("ABC");
  });

  it("collapses whitespace and caps the length", () => {
    expect(sanitizeTokenText("  Dog   Wif   Hat ", 32)).toBe("Dog Wif Hat");
    expect(sanitizeTokenText("ABCDEFGHIJKLMNOP", 12)).toBe("ABCDEFGHIJK…");
  });

  it("returns empty text for non-strings", () => {
    expect(sanitizeTokenText(undefined, 12)).toBe("");
    expect(sanitizeTokenText(42, 12)).toBe("");
  });

  it("folds full-width look-alikes to ASCII", () => {
    expect(sanitizeTokenText("ＵＳＤＣ", 12)).toBe("USDC");
  });
});

describe("isSuspiciousToken", () => {
  it("allows ordinary meme tokens", () => {
    expect(isSuspiciousToken({ symbol: "PEPE", name: "Pepe" })).toBe(false);
    expect(isSuspiciousToken({ symbol: "WIF", name: "dogwifhat" })).toBe(false);
  });

  it("flags tokens posing as USDC, EURC or cirBTC", () => {
    expect(isSuspiciousToken({ symbol: "USDC", name: "USD Coin" })).toBe(true);
    expect(isSuspiciousToken({ symbol: "USDC.e", name: "Bridged" })).toBe(true);
    expect(isSuspiciousToken({ symbol: "EURC", name: "x" })).toBe(true);
    expect(isSuspiciousToken({ symbol: "CIRBTC", name: "x" })).toBe(true);
    expect(isSuspiciousToken({ symbol: "XYZ", name: "Circle Rewards" })).toBe(true);
    expect(isSuspiciousToken({ symbol: "COIN", name: "USD Coin v2" })).toBe(true);
  });

  it("flags look-alike characters", () => {
    // Cyrillic DZE (U+0405) in place of S.
    expect(isSuspiciousToken({ symbol: "UЅDC", name: "x" })).toBe(true);
  });

  it("flags spam text and empty symbols", () => {
    expect(isSuspiciousToken({ symbol: "GIFT", name: "Claim at arc-drop.xyz" })).toBe(true);
    expect(isSuspiciousToken({ symbol: "VISIT", name: "visit www.scam.io" })).toBe(true);
    expect(isSuspiciousToken({ symbol: "", name: "" })).toBe(true);
  });
});
