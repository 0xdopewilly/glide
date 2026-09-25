import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { after, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { relinkUser, upsertUserFromClerk } from "@/lib/users";

/** How often (per server instance) an existing user's email is re-synced
 * from Clerk. The DB row serves email/displayName on every request; Clerk's
 * Backend API (a network call, rate-limited) is only hit for new users and
 * then at most this often, off the request path. */
const CLERK_SYNC_INTERVAL_MS = 10 * 60 * 1000;
const lastClerkSync = new Map<string, number>();

async function readClerkIdentity(): Promise<{
  email: string;
  emailVerified: boolean;
  displayName: string | null;
} | null> {
  const clerkUser = await currentUser();
  const address =
    clerkUser?.primaryEmailAddress ?? clerkUser?.emailAddresses?.[0];
  const email = address?.emailAddress;
  if (!email) return null;
  const displayName =
    clerkUser?.fullName?.trim() ||
    [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") ||
    null;
  return {
    email,
    emailVerified: address?.verification?.status === "verified",
    displayName,
  };
}

/** Moving Clerk instances (development → production) gives every returning
 * user a new Clerk id, while their row, wallets and history sit under the old
 * id with the same email. Re-key that row to the new id — only for a
 * Clerk-verified email, and only when the old id isn't a user of this Clerk
 * instance, so one live account can never take over another's. */
async function relinkFromPreviousClerkInstance(
  userId: string,
  identity: { email: string; emailVerified: boolean },
): Promise<void> {
  if (!identity.emailVerified) return;
  const previous = await prisma.user.findFirst({
    where: {
      email: { equals: identity.email, mode: "insensitive" },
      NOT: { id: userId },
    },
    select: { id: true },
  });
  if (!previous) return;
  try {
    const clerk = await clerkClient();
    await clerk.users.getUser(previous.id);
    return; // Still a user of this instance: not a move, leave it alone.
  } catch (err) {
    if (!isClerkAPIResponseError(err) || err.status !== 404) throw err;
  }
  await relinkUser(previous.id, userId);
  console.info("[Glide] re-linked account to new Clerk id", {
    from: previous.id,
    to: userId,
  });
}

export async function requireSessionUser(): Promise<
  | {
      userId: string;
      email: string;
      displayName: string | null;
    }
  | NextResponse
> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, displayName: true },
  });

  if (row?.email) {
    const last = lastClerkSync.get(userId) ?? 0;
    if (Date.now() - last > CLERK_SYNC_INTERVAL_MS) {
      lastClerkSync.set(userId, Date.now());
      after(async () => {
        try {
          const identity = await readClerkIdentity();
          if (!identity) return;
          // Email follows Clerk; the name is only filled in when empty so
          // an in-app profile edit (stored only in the DB) is never undone.
          await prisma.user.update({
            where: { id: userId },
            data: {
              email: identity.email,
              ...(row.displayName == null && identity.displayName
                ? { displayName: identity.displayName }
                : {}),
            },
          });
        } catch (err) {
          console.warn("[Glide] clerk profile sync:", err);
        }
      });
    }
    return { userId, email: row.email, displayName: row.displayName };
  }

  // First request for this user: create the row from Clerk.
  const identity = await readClerkIdentity();
  if (!identity) {
    return NextResponse.json(
      { error: "Account email is required" },
      { status: 400 },
    );
  }
  await relinkFromPreviousClerkInstance(userId, identity);
  const { email, displayName } = identity;
  await upsertUserFromClerk({ id: userId, email, displayName });
  lastClerkSync.set(userId, Date.now());

  return { userId, email, displayName };
}

export function isAuthError(
  result: { userId: string } | NextResponse,
): result is NextResponse {
  return result instanceof NextResponse;
}
