import { describe, expect, it } from "vitest";
import { navDirection } from "@/lib/nav-direction";

// Tabs switch instantly; opening a screen pushes; back and "up" pop.
describe("navDirection", () => {
  it("keeps tab switches instant, even via browser back", () => {
    expect(navDirection("/", "/payments", false)).toBe("tab");
    expect(navDirection("/ask", "/", true)).toBe("tab");
  });

  it("pushes when opening a screen", () => {
    expect(navDirection("/", "/profile", false)).toBe("push");
    expect(navDirection("/profile", "/profile/details", false)).toBe("push");
    expect(navDirection("/payments", "/send", false)).toBe("push");
  });

  it("pops on back, on returning to a tab, and on going up", () => {
    expect(navDirection("/profile/details", "/profile", true)).toBe("pop");
    expect(navDirection("/send", "/", false)).toBe("pop");
    expect(navDirection("/profile/details", "/profile", false)).toBe("pop");
  });

  it("ignores same-path updates", () => {
    expect(navDirection("/send", "/send", false)).toBeNull();
  });
});
