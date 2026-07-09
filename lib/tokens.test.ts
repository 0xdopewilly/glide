import { describe, expect, it } from "vitest";
import { netFlowUsd } from "@/lib/tokens";

const iso = (msAgo: number) => new Date(Date.now() - msAgo).toISOString();
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

// netFlowUsd powers the home "today" delta. It must be SIGNED (can go negative),
// windowed to 24h, and take direction from `variant` — the debit label uses a
// U+2212 minus, not an ASCII sign, so the string alone can't be trusted.
describe("netFlowUsd", () => {
  it("is zero for no transactions", () => {
    expect(netFlowUsd([])).toBe(0);
  });

  it("adds credits and subtracts debits within the window", () => {
    const net = netFlowUsd([
      { variant: "credit", amount: "+$50.00", createdAt: iso(MIN) },
      { variant: "debit", amount: "−$20.00", createdAt: iso(2 * MIN) },
    ]);
    expect(net).toBeCloseTo(30, 5);
  });

  it("can be negative", () => {
    expect(
      netFlowUsd([{ variant: "debit", amount: "−$75.00", createdAt: iso(MIN) }]),
    ).toBeCloseTo(-75, 5);
  });

  it("ignores transactions older than the window", () => {
    const net = netFlowUsd([
      { variant: "credit", amount: "+$10.00", createdAt: iso(2 * DAY) },
      { variant: "credit", amount: "+$5.00", createdAt: iso(MIN) },
    ]);
    expect(net).toBeCloseTo(5, 5);
  });

  it("ignores swaps/neutral rows and rows without a timestamp", () => {
    const net = netFlowUsd([
      { variant: "neutral", amount: "$99.00", createdAt: iso(MIN) },
      { variant: "credit", amount: "+$8.00" }, // no createdAt
      { variant: "credit", amount: "+$2.00", createdAt: iso(MIN) },
    ]);
    expect(net).toBeCloseTo(2, 5);
  });

  it("takes the sign from variant, not the amount string (U+2212 debit)", () => {
    expect(
      netFlowUsd([{ variant: "debit", amount: "−$12.00", createdAt: iso(MIN) }]),
    ).toBeCloseTo(-12, 5);
  });

  it("reads EURC € amounts by magnitude", () => {
    expect(
      netFlowUsd([{ variant: "credit", amount: "+€10.00", createdAt: iso(HOUR) }]),
    ).toBeCloseTo(10, 5);
  });
});
