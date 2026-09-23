// Auto-resume for stuck CCTP bridges. A bridge whose burn landed but whose
// attestation/mint didn't finish in the original request is left "pending"
// with its App Kit result saved in metadata.bridgeResult (see
// lib/cctp-receive.ts completeSweep and app/api/bridge/route.ts). This picks
// those rows up and finishes them with kit.retryBridge.
//
// Covers both directions:
//   - outbound  kind "bridge"            Arc -> external address (forwarder mint)
//   - inbound   kind "receive"+originChain  external chain -> Arc (Universal Receive)
import type { BridgeResult } from "@circle-fin/app-kit";
import {
  ARC_KIT_CHAIN,
  BRIDGE_NETWORKS,
  extractBridgeTx,
  getGlideAppKit,
} from "@/lib/app-kit";
import { prisma } from "@/lib/db";
import { notifyBridgeComplete, notifyIncomingFromChain } from "@/lib/push";
import type { Prisma } from "@prisma/client";

/** Leave a bridge alone this long after its last update: the original call
 * (or a previous resume) may still be waiting on attestation. */
const RESUME_AFTER_MS = 3 * 60 * 1000;
/** Give up auto-resuming after this many attempts (support can take over
 * with the saved result). */
export const MAX_RESUME_ATTEMPTS = 8;

type Meta = Record<string, unknown>;

function metaOf(value: unknown): Meta {
  return value && typeof value === "object" ? (value as Meta) : {};
}

function amountOf(label: string): string {
  const n = parseFloat(label.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

/** The saved result is JSON; retryBridge needs real chain definitions, so
 * swap them back in from App Kit by chain id. Returns null if a chain isn't
 * one we bridge with (can't be resumed safely). */
export function rehydrateBridgeResult(snapshot: unknown): BridgeResult | null {
  const r = metaOf(snapshot);
  const source = metaOf(r.source);
  const destination = metaOf(r.destination);
  const chains = [ARC_KIT_CHAIN, ...Object.values(BRIDGE_NETWORKS).map((n) => n.chain)];
  const byId = new Map<number, (typeof chains)[number]>(
    chains.map((c) => [c.chainId, c]),
  );
  const sourceChain = byId.get(Number(metaOf(source.chain).chainId));
  const destChain = byId.get(Number(metaOf(destination.chain).chainId));
  if (!sourceChain || !destChain || !Array.isArray(r.steps)) return null;
  return {
    ...(r as unknown as BridgeResult),
    source: { ...(source as unknown as BridgeResult["source"]), chain: sourceChain },
    destination: {
      ...(destination as unknown as BridgeResult["destination"]),
      chain: destChain,
    },
  };
}

type ResumeOutcome = "settled" | "failed" | "pending" | "skipped";

async function resumeOne(row: {
  id: string;
  userId: string;
  kind: string;
  amountLabel: string;
  originChain: string | null;
  metadata: Prisma.JsonValue;
  updatedAt: Date;
}): Promise<ResumeOutcome> {
  const meta = metaOf(row.metadata);
  const attempts = Number(meta.resumeAttempts ?? 0);
  if (attempts >= MAX_RESUME_ATTEMPTS) return "skipped";
  const result = rehydrateBridgeResult(meta.bridgeResult);
  if (!result) return "skipped";

  // Lease via optimistic lock on updatedAt: bumping the attempt count
  // changes updatedAt, so a concurrent resumer's update matches nothing.
  const lease = await prisma.transaction.updateMany({
    where: { id: row.id, status: "pending", updatedAt: row.updatedAt },
    data: {
      metadata: {
        ...meta,
        resumeAttempts: attempts + 1,
        lastResumeAt: new Date().toISOString(),
      } as Prisma.InputJsonValue,
    },
  });
  if (lease.count === 0) return "skipped";

  const { kit, adapter } = getGlideAppKit();
  const outbound = row.kind === "bridge";
  let tx: ReturnType<typeof extractBridgeTx>;
  try {
    // Outbound mints go through Circle's forwarder (no destination adapter);
    // inbound mints land in the user's Arc wallet, signed by our adapter.
    const retried = await kit.retryBridge(result, {
      from: adapter,
      ...(outbound ? {} : { to: adapter }),
    });
    tx = extractBridgeTx(retried);
  } catch (err) {
    console.error("[Glide] bridge resume:", row.id, err);
    return "pending"; // attempt counted; tried again later
  }

  const settled = tx.state === "success";
  const failed = tx.state === "error" && !tx.burned;
  const { bridgeResult: _drop, ...rest } = meta;
  void _drop;
  await prisma.transaction.update({
    where: { id: row.id },
    data: {
      status: settled ? (outbound ? "completed" : "complete") : failed ? "failed" : "pending",
      ...(tx.txHash ? { txHash: tx.txHash } : {}),
      ...(tx.explorerUrl ? { explorerUrl: tx.explorerUrl } : {}),
      metadata: {
        ...rest,
        resumeAttempts: attempts + 1,
        ...(settled || failed ? {} : { bridgeState: tx.state, bridgeResult: tx.snapshot }),
      } as Prisma.InputJsonValue,
    },
  });

  if (settled) {
    const amount = amountOf(row.amountLabel);
    if (outbound) {
      await notifyBridgeComplete(
        row.userId,
        amount,
        String(meta.destination ?? "the destination"),
      ).catch((err) => console.error("[Glide] bridge push:", err));
    } else {
      await notifyIncomingFromChain(row.userId, {
        amount,
        chainLabel: row.originChain ?? "another chain",
        transactionId: row.id,
      }).catch((err) => console.error("[Glide] sweep push:", err));
    }
    return "settled";
  }
  return failed ? "failed" : "pending";
}

/** Resume stuck bridges (for one user, or everyone from the cron). Bridges
 * are slow (attestation, mint), so callers keep `limit` small. Never throws. */
export async function resumeStuckBridges(opts: {
  userId?: string;
  limit?: number;
}): Promise<{ id: string; outcome: ResumeOutcome }[]> {
  try {
    const rows = await prisma.transaction.findMany({
      where: {
        status: "pending",
        updatedAt: { lte: new Date(Date.now() - RESUME_AFTER_MS) },
        OR: [{ kind: "bridge" }, { kind: "receive", originChain: { not: null } }],
        ...(opts.userId ? { userId: opts.userId } : {}),
      },
      orderBy: { updatedAt: "asc" },
      take: (opts.limit ?? 1) * 4, // some rows have no saved result; skip past them
      select: {
        id: true,
        userId: true,
        kind: true,
        amountLabel: true,
        originChain: true,
        metadata: true,
        updatedAt: true,
      },
    });
    const results: { id: string; outcome: ResumeOutcome }[] = [];
    for (const row of rows) {
      if (results.filter((r) => r.outcome !== "skipped").length >= (opts.limit ?? 1)) break;
      results.push({ id: row.id, outcome: await resumeOne(row) });
    }
    return results;
  } catch (err) {
    console.error("[Glide] resumeStuckBridges:", err);
    return [];
  }
}
