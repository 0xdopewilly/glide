import { isAuthError, requireSessionUser } from "@/lib/api-auth";
import { setRuleActive } from "@/lib/automations";
import { NextResponse } from "next/server";

/** PATCH - activate/deactivate a rule. Body: { active: boolean }. */
export async function PATCH(
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

  const active = Boolean((body as Record<string, unknown>).active);
  const ok = await setRuleActive(session.userId, id, active);
  if (!ok) return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  return NextResponse.json({ ok: true, active });
}

/** DELETE - turn a rule off (soft: sets active=false, keeps run history). */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireSessionUser();
  if (isAuthError(session)) return session;

  const { id } = await params;
  const ok = await setRuleActive(session.userId, id, false);
  if (!ok) return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
