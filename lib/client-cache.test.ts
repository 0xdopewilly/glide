import { afterEach, describe, expect, it, vi } from "vitest";

// A device that used testnet must not paint testnet balances — or a testnet
// receive address someone could send real USDC to — once the same user opens
// mainnet. The module wipes user caches when the network changes.
class MemoryStorage {
  private data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  key(i: number) {
    return [...this.data.keys()][i] ?? null;
  }
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
}

async function loadOn(network: string, local: MemoryStorage) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_GLIDE_NETWORK", network);
  vi.stubGlobal("window", {});
  vi.stubGlobal("localStorage", local);
  vi.stubGlobal("sessionStorage", new MemoryStorage());
  return import("@/lib/client-cache");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("client cache network guard", () => {
  it("wipes testnet caches the first time mainnet loads", async () => {
    const local = new MemoryStorage();
    await loadOn("testnet", local);
    local.setItem("glide.balances.user_1", "{\"usdc\":\"41\"}");
    local.setItem("glide.wallet.user_1", "{\"address\":\"0xtestnet\"}");
    local.setItem("glide:receive-addresses:wallet_testnet", "[]");
    local.setItem("glide.lastUser", "{\"id\":\"user_1\"}");
    local.setItem("glide_privacy", "keep");

    await loadOn("mainnet", local);

    expect(local.getItem("glide.balances.user_1")).toBeNull();
    expect(local.getItem("glide.wallet.user_1")).toBeNull();
    expect(local.getItem("glide:receive-addresses:wallet_testnet")).toBeNull();
    expect(local.getItem("glide.lastUser")).toBeNull();
    expect(local.getItem("glide_privacy")).toBe("keep");
    expect(local.getItem("glide.network")).toBe("mainnet");
  });

  it("keeps caches across reloads on the same network", async () => {
    const local = new MemoryStorage();
    await loadOn("mainnet", local);
    local.setItem("glide.balances.user_1", "{\"usdc\":\"5\"}");

    await loadOn("mainnet", local);

    expect(local.getItem("glide.balances.user_1")).toBe("{\"usdc\":\"5\"}");
  });
});
