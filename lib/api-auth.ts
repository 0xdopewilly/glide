import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { upsertUserFromClerk } from "@/lib/users";

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

  const clerkUser = await currentUser();
  const email =
    clerkUser?.primaryEmailAddress?.emailAddress ??
    clerkUser?.emailAddresses?.[0]?.emailAddress;

  if (!email) {
    return NextResponse.json(
      { error: "Account email is required" },
      { status: 400 },
    );
  }

  const displayName =
    clerkUser?.fullName?.trim() ||
    [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") ||
    null;

  await upsertUserFromClerk({ id: userId, email, displayName });

  return { userId, email, displayName };
}

export function isAuthError(
  result: { userId: string } | NextResponse,
): result is NextResponse {
  return result instanceof NextResponse;
}
