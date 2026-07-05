import { isAuthError, requireSessionUser } from "@/lib/api-auth";
import {
  createSaveOnReceiveRule,
  createScheduleRule,
  createThresholdRule,
  listAutomations,
} from "@/lib/automations";
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
  const type = typeof b.type === "string" ? b.type : "save_on_receive";
  const token = typeof b.token === "string" ? b.token : undefined;
  const str = (v: unknown) =>
    typeof v === "string" ? v : typeof v === "number" ? String(v) : undefined;

  try {
    if (type === "save_on_receive") {
      const percent =
        typeof b.percent === "number" ? b.percent : Number(b.percent);
      const { rule, savings } = await createSaveOnReceiveRule({
        userId: session.userId,
        percent,
        token,
      });
      return NextResponse.json({ rule, savingsWalletAddress: savings.address });
    }
    if (type === "scheduled_send") {
      const rule = await createScheduleRule({
        userId: session.userId,
        amount: str(b.amount) ?? "",
        destination: str(b.destination) ?? "",
        recipientLabel: str(b.recipientLabel),
        frequency: str(b.frequency) ?? "",
        token,
      });
      return NextResponse.json({ rule });
    }
    if (type === "threshold_save") {
      const rule = await createThresholdRule({
        userId: session.userId,
        thresholdAmount: str(b.thresholdAmount) ?? "",
        token,
      });
      return NextResponse.json({ rule });
    }
    return NextResponse.json(
      { error: `Unknown automation type "${type}"` },
      { status: 400 },
    );
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
