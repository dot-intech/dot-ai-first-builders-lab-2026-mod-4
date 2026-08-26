import { cookies } from "next/headers";
import { validarSesion } from "@/lib/auth/session";

export const SESSION_COOKIE_NAME = "nutrashot_session";

export type ResultadoGuard = { autenticado: true; usuarioId: string } | { autenticado: false };

/** Para Server Components/Pages (usa `cookies()` de Next, no un `Request`). */
export async function obtenerSesionActual(): Promise<ResultadoGuard> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return { autenticado: false };
  }

  const resultado = await validarSesion(token);
  if (!resultado.valido) {
    return { autenticado: false };
  }

  return { autenticado: true, usuarioId: resultado.usuarioId };
}

/** Para route handlers (`app/api/**`), que reciben un `Request` estándar. */
export async function exigirSesion(request: Request): Promise<ResultadoGuard> {
  const token = leerCookie(request.headers.get("cookie"), SESSION_COOKIE_NAME);
  if (!token) {
    return { autenticado: false };
  }

  const resultado = await validarSesion(token);
  if (!resultado.valido) {
    return { autenticado: false };
  }

  return { autenticado: true, usuarioId: resultado.usuarioId };
}

function leerCookie(cookieHeader: string | null, nombre: string): string | null {
  if (!cookieHeader) return null;
  for (const parte of cookieHeader.split(";")) {
    const [clave, ...resto] = parte.trim().split("=");
    if (clave === nombre) {
      return resto.join("=");
    }
  }
  return null;
}
