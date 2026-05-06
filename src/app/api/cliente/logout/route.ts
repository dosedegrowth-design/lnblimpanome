import { NextResponse } from "next/server";
import { clearClienteSession } from "@/lib/auth/cliente";

export async function POST() {
  await clearClienteSession();
  return NextResponse.json({ ok: true });
}
