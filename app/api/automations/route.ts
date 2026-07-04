import { isAuthError, requireSessionUser } from "@/lib/api-auth";
import { createSaveOnReceiveRule, listAutomations } from "@/lib/automations";
import { NextResponse } from "next/server";

/** GET - the user's automation rules + recent run history (dashboard). */
export async function GET() {
  const session = await requireSessionUser();
  if (isAuthError(session)) return session;

  const data = await listAutomations(session.userId);
  return NextResponse.json(data);
}

/** POST - create a "save N% of every payment" rule. Provisions the Savings
 * wallet on first use. Body: { percent: number, token?: "USDC" | "EURC" }. */
export async function POST(req: Request) {
  const session = await requireSessionUser();
  if (isAuthError(session)) return session;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const b = (body ?? {}) as Record<string, unknown>;
  const percent =
    typeof b.percent === "number" ? b.percent : Number(b.percent);
  const token = typeof b.token === "string" ? b.token : undefined;

  try {
    const { rule, savings } = await createSaveOnReceiveRule({
      userId: session.userId,
      percent,
      token,
    });
    return NextResponse.json({ rule, savingsWalletAddress: savings.address });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Could not create automation",
      },
      { status: 400 },
    );
  }
}
