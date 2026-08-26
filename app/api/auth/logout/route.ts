import { NextResponse } from "next/server";
import { exigirSesion, SESSION_COOKIE_NAME } from "@/lib/auth/guard";
import { cerrarSesion } from "@/lib/auth/session";

export async function POST(request: Request): Promise<Response> {
  const sesion = await exigirSesion(request);
  if (!sesion.autenticado) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  await cerrarSesion(sesion.usuarioId);

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
