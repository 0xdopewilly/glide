import { isAuthError, requireSessionUser } from "@/lib/api-auth";
import { approvePending, rejectPending } from "@/lib/approvals";
import { NextResponse } from "next/server";

/** POST { decision: "approve" | "reject" } - act on a pending approval. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireSessionUser();
  if (isAuthError(session)) return session;

  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const decision = (body as Record<string, unknown>).decision;
  if (decision === "approve") {
    const ok = await approvePending(session.userId, id);
    if (!ok) {
      return NextResponse.json(
        { error: "Could not approve — it may be gone or already handled." },
        { status: 409 },
      );
    }
    return NextResponse.json({ ok: true, status: "executed" });
  }
  if (decision === "reject") {
    const ok = await rejectPending(session.userId, id);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true, status: "rejected" });
  }
  return NextResponse.json(
    { error: "decision must be 'approve' or 'reject'" },
    { status: 400 },
  );
}
