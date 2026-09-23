import { isAuthError, requireSessionUser } from "@/lib/api-auth";
import { getApprovalPolicy, upsertApprovalPolicy } from "@/lib/approvals";
import { assertPinVerified } from "@/lib/pin";
import { NextResponse } from "next/server";

/** GET - the user's approval policy (null if never set = auto-approve all). */
export async function GET() {
  const session = await requireSessionUser();
  if (isAuthError(session)) return session;
  const policy = await getApprovalPolicy(session.userId);
  return NextResponse.json({ policy });
}

/** PUT { autoApproveUnder?: string | null, requireForNewRecipient?: boolean }
 * PIN-gated: the policy decides how much automations may move unattended. */
export async function PUT(req: Request) {
  const session = await requireSessionUser();
  if (isAuthError(session)) return session;

  const gate = await assertPinVerified(session.userId);
  if (!gate.ok) {
    return NextResponse.json(
      { error: "Confirm with your PIN to continue.", code: gate.code },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const b = (body ?? {}) as Record<string, unknown>;
  const policy = await upsertApprovalPolicy(session.userId, {
    autoApproveUnder:
      b.autoApproveUnder === null
        ? null
        : typeof b.autoApproveUnder === "string"
          ? b.autoApproveUnder
          : typeof b.autoApproveUnder === "number"
            ? String(b.autoApproveUnder)
            : undefined,
    requireForNewRecipient:
      typeof b.requireForNewRecipient === "boolean"
        ? b.requireForNewRecipient
        : undefined,
  });
  return NextResponse.json({ policy });
}
