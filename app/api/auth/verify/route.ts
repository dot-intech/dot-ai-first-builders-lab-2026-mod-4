import { NextResponse } from "next/server";
import { validarMagicLink } from "@/lib/auth/magic-link";
import { crearSesion } from "@/lib/auth/session";
import { SESSION_COOKIE_NAME } from "@/lib/auth/guard";

export async function GET(request: Request): Promise<Response> {
  const token = new URL(request.url).searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token requerido" }, { status: 401 });
  }

  const resultado = await validarMagicLink(token);
  if (!resultado.valido) {
    return NextResponse.json(
      { error: "El link no es válido o expiró. Solicitá uno nuevo." },
      { status: 401 }
    );
  }

  const { token: sessionToken } = await crearSesion(resultado.usuarioId);

  const response = NextResponse.redirect(new URL("/tablero", request.url), 302);
  response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
  });

  return response;
}
