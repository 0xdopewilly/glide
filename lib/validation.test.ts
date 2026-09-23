import { describe, expect, it } from "vitest";
import {
  isValidUsername,
  isValidWalletAddress,
  normalizeUsername,
  parseMoneyAmount,
} from "@/lib/validation";

// The server treats parseMoneyAmount as the source of truth for send/withdraw
// amounts — pin the boundary behavior so a regression can't let $0 or negative
// transfers through.
describe("parseMoneyAmount", () => {
  it("accepts positive amounts", () => {
    expect(parseMoneyAmount("10")).toBe(10);
    expect(parseMoneyAmount("0.01")).toBeCloseTo(0.01, 5);
    expect(parseMoneyAmount("1234.56")).toBeCloseTo(1234.56, 5);
  });

  it("rejects partial numbers parseFloat would accept", () => {
    expect(parseMoneyAmount("10abc")).toBeNull();
    expect(parseMoneyAmount("1e3")).toBeNull();
    expect(parseMoneyAmount("5 USDC")).toBeNull();
    expect(parseMoneyAmount("Infinity")).toBeNull();
  });

  it("reads thousands separators instead of truncating at the comma", () => {
    expect(parseMoneyAmount("1,000")).toBe(1000);
    expect(parseMoneyAmount("1,234.50")).toBeCloseTo(1234.5, 5);
  });

  it("rejects more decimals than the token supports when asked", () => {
    expect(parseMoneyAmount("0.005", { maxDecimals: 2 })).toBeNull();
    expect(parseMoneyAmount("0.05", { maxDecimals: 2 })).toBeCloseTo(0.05, 5);
    expect(parseMoneyAmount("0.00012345", { maxDecimals: 8 })).toBeCloseTo(0.00012345, 10);
  });

  it("rejects zero, negatives, and non-numbers", () => {
    expect(parseMoneyAmount("0")).toBeNull();
    expect(parseMoneyAmount("-5")).toBeNull();
    expect(parseMoneyAmount("abc")).toBeNull();
    expect(parseMoneyAmount("")).toBeNull();
    expect(parseMoneyAmount("   ")).toBeNull();
  });
});

describe("username validation", () => {
  it("normalizes @ prefix and case", () => {
    expect(normalizeUsername("@Khadee")).toBe("khadee");
    expect(normalizeUsername("  BOB ")).toBe("bob");
  });

  it("accepts valid handles, rejects short/reserved", () => {
    expect(isValidUsername("khadee")).toBe(true);
    expect(isValidUsername("ab")).toBe(false);
    expect(isValidUsername("admin")).toBe(false);
    expect(isValidUsername("glide")).toBe(false);
  });
});

describe("isValidWalletAddress", () => {
  it("rejects obvious non-addresses", () => {
    expect(isValidWalletAddress("nope")).toBe(false);
    expect(isValidWalletAddress("0x123")).toBe(false);
    expect(isValidWalletAddress("")).toBe(false);
  });
});
