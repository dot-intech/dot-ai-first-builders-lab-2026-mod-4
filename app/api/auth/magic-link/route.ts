import { NextResponse } from "next/server";
import { emitirMagicLink } from "@/lib/auth/magic-link";
import { enviarMagicLink } from "@/lib/email/send-magic-link";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request): Promise<Response> {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";

  if (!email || !EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: "Email inválido" }, { status: 400 });
  }

  const { token } = await emitirMagicLink(email);
  const link = new URL(`/api/auth/verify?token=${token}`, request.url).toString();
  await enviarMagicLink(email, link);

  return NextResponse.json({ ok: true });
}
