import { describe, expect, it } from "vitest";
import { settledSummary, settlementOutcome } from "@/lib/settlement";

// Money movements are only "done" once Circle reports them settled. Pin the
// state mapping: marking INITIATED or CONFIRMED as done (or FAILED as
// pending) is exactly the bug this module exists to prevent.
describe("settlementOutcome", () => {
  it("treats only COMPLETE as settled", () => {
    expect(settlementOutcome("COMPLETE")).toBe("settled");
    for (const s of ["INITIATED", "CLEARED", "QUEUED", "SENT", "CONFIRMED", "STUCK"]) {
      expect(settlementOutcome(s)).toBe("pending");
    }
  });

  it("treats FAILED, DENIED and CANCELLED as failed", () => {
    for (const s of ["FAILED", "DENIED", "CANCELLED"]) {
      expect(settlementOutcome(s)).toBe("failed");
    }
  });

  it("keeps waiting when the state is unknown (API hiccup)", () => {
    expect(settlementOutcome(undefined)).toBe("pending");
  });
});

describe("settledSummary", () => {
  it("turns in-flight wording into done wording", () => {
    expect(settledSummary("Saving $1.00 (10%) from a $10.00 payment")).toBe(
      "Saved $1.00 (10%) from a $10.00 payment",
    );
    expect(settledSummary("Sending $5.00 to @bob")).toBe("Sent $5.00 to @bob");
    expect(settledSummary("Approved — sending $5.00 to @bob")).toBe(
      "Approved — sent $5.00 to @bob",
    );
  });
});
