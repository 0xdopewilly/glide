import { describe, expect, it } from "vitest";
import { stableIdempotencyKey } from "@/lib/automation-execute";

// A stable, deterministic idempotency key is what makes an automation transfer
// retry-safe: same occurrence → same key → Circle dedupes → no double-send.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("stableIdempotencyKey", () => {
  it("produces a valid RFC-4122 v4-shaped UUID", () => {
    expect(stableIdempotencyKey("sched:rule:2026-07-09T00:00:00.000Z")).toMatch(
      UUID_RE,
    );
    expect(stableIdempotencyKey("approval:abc123")).toMatch(UUID_RE);
  });

  it("is deterministic for the same seed", () => {
    expect(stableIdempotencyKey("thresh:rule:2026-07-09")).toBe(
      stableIdempotencyKey("thresh:rule:2026-07-09"),
    );
  });

  it("differs for different seeds", () => {
    expect(stableIdempotencyKey("a")).not.toBe(stableIdempotencyKey("b"));
    expect(stableIdempotencyKey("sched:r1:t")).not.toBe(
      stableIdempotencyKey("sched:r2:t"),
    );
  });
});
