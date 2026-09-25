import { describe, expect, it } from "vitest";
import { parseCoinbaseRates, parseCoinGecko, sanePrice } from "@/lib/prices";

// A bad or hostile price feed must not be able to inflate a balance: prices
// outside a sane band are dropped (shown without a dollar value instead).
describe("sanePrice", () => {
  it("accepts plausible prices", () => {
    expect(sanePrice("EURC", 1.14)).toBe(1.14);
    expect(sanePrice("cirBTC", "84690")).toBe(84690);
  });

  it("rejects implausible or malformed prices", () => {
    expect(sanePrice("EURC", 1000)).toBeNull();
    expect(sanePrice("cirBTC", 1)).toBeNull();
    expect(sanePrice("cirBTC", "NaN")).toBeNull();
    expect(sanePrice("EURC", undefined)).toBeNull();
  });
});

describe("feed parsing", () => {
  it("reads CoinGecko simple prices", () => {
    expect(
      parseCoinGecko({ bitcoin: { usd: 84690 }, "euro-coin": { usd: 1.14 } }),
    ).toEqual({ EURC: 1.14, cirBTC: 84690 });
    expect(parseCoinGecko({})).toEqual({ EURC: null, cirBTC: null });
  });

  it("inverts Coinbase units-per-dollar rates", () => {
    const prices = parseCoinbaseRates({
      data: { rates: { EUR: "0.8", BTC: "0.00001" } },
    });
    expect(prices.EURC).toBeCloseTo(1.25, 6);
    expect(prices.cirBTC).toBeCloseTo(100_000, 3);
    expect(parseCoinbaseRates({ data: { rates: { BTC: "0" } } }).cirBTC).toBeNull();
  });
});
