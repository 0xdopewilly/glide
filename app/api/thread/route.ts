import { isAuthError, requireSessionUser } from "@/lib/api-auth";
import { formatStableAmount } from "@/lib/currency-format";
import { prisma } from "@/lib/db";
import { shortenAddress } from "@/lib/format";
import { findUserByUsername, findUserByWalletAddress } from "@/lib/usernames";
import {
  isValidUsername,
  isValidWalletAddress,
  normalizeUsername,
} from "@/lib/validation";
import { NextRequest, NextResponse } from "next/server";
import { getAddress } from "viem";

export type ThreadItem = {
  id: string;
  kind: "sent" | "received" | "request_out" | "request_in";
  /** Display amount without a sign, e.g. "$12.99". */
  amount: string;
  note?: string;
  createdAt: string;
  status?: string;
  /** Pending request to the viewer: pay it at /pay/[code]. */
  requestCode?: string;
};

export type ThreadResponse = {
  counterparty: {
    label: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    address: string;
    onGlidepay: boolean;
  };
  items: ThreadItem[];
};

function noteOf(metadata: unknown): string | undefined {
  if (!metadata || typeof metadata !== "object") return undefined;
  const note = (metadata as { note?: unknown }).note;
  return typeof note === "string" && note.trim() ? note.trim() : undefined;
}

/** Stored addresses may be lowercase or checksummed; match all forms. */
function addressForms(address: string): string[] {
  const forms = new Set([address, address.toLowerCase()]);
  try {
    forms.add(getAddress(address));
  } catch {
    /* not a checksummable address — the raw forms still apply */
  }
  return [...forms];
}

/** GET ?with=@tag|0xaddress — the viewer's payments and requests with one
 * person, oldest first: a payment thread (no free-text messages). Only the
 * viewer's own rows are read. */
export async function GET(request: NextRequest) {
  const session = await requireSessionUser();
  if (isAuthError(session)) return session;

  const raw = request.nextUrl.searchParams.get("with")?.trim() ?? "";
  let other: {
    id?: string;
    username: string | null;
    displayName: string | null;
    address: string;
  };

  if (isValidWalletAddress(raw)) {
    const u = await findUserByWalletAddress(raw);
    other = {
      id: u?.id,
      username: u?.username ?? null,
      displayName: u?.displayName ?? null,
      address: u?.circleWalletAddress ?? raw,
    };
  } else {
    const tag = normalizeUsername(raw.replace(/^@+/, ""));
    if (!isValidUsername(tag)) {
      return NextResponse.json({ error: "Enter a pay tag or address" }, { status: 400 });
    }
    const u = await findUserByUsername(tag);
    if (!u?.circleWalletAddress) {
      return NextResponse.json({ error: `No glidepay user @${tag}` }, { status: 404 });
    }
    other = {
      id: u.id,
      username: u.username ?? tag,
      displayName: u.displayName ?? null,
      address: u.circleWalletAddress,
    };
  }
  if (other.id && other.id === session.userId) {
    return NextResponse.json({ error: "That's you" }, { status: 400 });
  }

  const addrs = addressForms(other.address);
  const [me, profile, txs] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.userId }, select: { username: true } }),
    other.id
      ? prisma.user.findUnique({ where: { id: other.id }, select: { avatarUrl: true } })
      : Promise.resolve(null),
    prisma.transaction.findMany({
      where: {
        userId: session.userId,
        kind: { in: ["send", "receive"] },
        OR: [
          ...addrs.map((a) => ({ metadata: { path: ["recipientAddress"], equals: a } })),
          ...addrs.map((a) => ({ metadata: { path: ["fromAddress"], equals: a } })),
          ...(other.id ? [{ metadata: { path: ["fromUserId"], equals: other.id } }] : []),
        ],
      },
      orderBy: { createdAt: "asc" },
      take: 200,
      select: { id: true, kind: true, amountLabel: true, status: true, metadata: true, createdAt: true },
    }),
  ]);

  const myTag = me?.username ?? null;
  const reqRows = other.id
    ? await prisma.paymentRequest.findMany({
        where: {
          OR: [
            {
              userId: session.userId,
              OR: [
                { targetUserId: other.id },
                ...(other.username ? [{ requestFromGlideTag: other.username }] : []),
              ],
            },
            {
              userId: other.id,
              OR: [
                { targetUserId: session.userId },
                ...(myTag ? [{ requestFromGlideTag: myTag }] : []),
              ],
            },
          ],
        },
        orderBy: { createdAt: "asc" },
        take: 100,
        select: {
          id: true,
          userId: true,
          amount: true,
          token: true,
          note: true,
          code: true,
          status: true,
          createdAt: true,
        },
      })
    : [];

  const items: ThreadItem[] = [
    ...txs.map((t) => ({
      id: t.id,
      kind: (t.kind === "send" ? "sent" : "received") as ThreadItem["kind"],
      amount: t.amountLabel.replace(/^[+\-−]\s*/, ""),
      note: noteOf(t.metadata),
      createdAt: t.createdAt.toISOString(),
      status: t.status ?? undefined,
    })),
    ...reqRows.map((r) => {
      const mine = r.userId === session.userId;
      return {
        id: `req-${r.id}`,
        kind: (mine ? "request_out" : "request_in") as ThreadItem["kind"],
        amount: formatStableAmount(r.amount, r.token),
        note: r.note?.trim() || undefined,
        createdAt: r.createdAt.toISOString(),
        status: r.status,
        ...(!mine && r.status === "pending" ? { requestCode: r.code } : {}),
      };
    }),
  ].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const body: ThreadResponse = {
    counterparty: {
      label: other.username
        ? `@${other.username}`
        : other.displayName || shortenAddress(other.address, 6),
      username: other.username,
      displayName: other.displayName,
      avatarUrl: profile?.avatarUrl ?? null,
      address: other.address,
      onGlidepay: Boolean(other.id),
    },
    items,
  };
  return NextResponse.json(body);
}
