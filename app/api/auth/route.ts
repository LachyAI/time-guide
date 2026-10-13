import { NextRequest, NextResponse } from "next/server";
import { signTicket } from "@/lib/ticket";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const correct = process.env.APP_PASSWORD ?? "";
  const secret = process.env.VOICE_TICKET_SECRET ?? "";

  if (!correct) {
    return NextResponse.json({ ok: false, error: "No password configured" }, { status: 500 });
  }
  if (password !== correct) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (!secret) {
    return NextResponse.json({ ok: false, error: "No ticket secret configured" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, ...signTicket(secret) });
}
