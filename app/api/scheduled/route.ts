import { isAuthError, requireSessionUser } from "@/lib/api-auth";
import {
  cancelScheduledTransfer,
  createScheduledTransfer,
  isScheduleFrequency,
  listScheduledTransfers,
  type ScheduleFrequency,
} from "@/lib/scheduled-transfers";
import { parseMoneyAmount } from "@/lib/validation";
import { NextRequest, NextResponse } from "next/server";

/** GET — list active scheduled transfers */
export async function GET() {
  const session = await requireSessionUser();
  if (isAuthError(session)) return session;

  const rows = await listScheduledTransfers(session.userId);
  return NextResponse.json({ scheduled: rows });
}

/** POST { destination, amount, frequency, note?, recipientLabel? } */
export async function POST(request: NextRequest) {
  const session = await requireSessionUser();
  if (isAuthError(session)) return session;

  const body = (await request.json()) as {
    destination?: string;
    amount?: string;
    frequency?: string;
    note?: string;
    recipientLabel?: string;
  };

  const destination = body.destination?.trim();
  const parsed = parseMoneyAmount(body.amount?.trim() ?? "");
  const frequency = body.frequency as ScheduleFrequency;

  if (!destination || parsed === null || parsed <= 0) {
    return NextResponse.json({ error: "Invalid destination or amount" }, { status: 400 });
  }
  if (!isScheduleFrequency(frequency)) {
    return NextResponse.json(
      {
        error:
          "frequency must be daily, weekly, monthly, or minutely (test only)",
      },
      { status: 400 },
    );
  }

  const row = await createScheduledTransfer({
    userId: session.userId,
    destination,
    amount: parsed.toFixed(2),
    frequency,
    note: body.note,
    recipientLabel: body.recipientLabel,
  });

  return NextResponse.json({ scheduled: row });
}

/** DELETE ?id= — cancel scheduled transfer */
export async function DELETE(request: NextRequest) {
  const session = await requireSessionUser();
  if (isAuthError(session)) return session;

  const id = request.nextUrl.searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  await cancelScheduledTransfer(session.userId, id);
  return NextResponse.json({ ok: true });
}
