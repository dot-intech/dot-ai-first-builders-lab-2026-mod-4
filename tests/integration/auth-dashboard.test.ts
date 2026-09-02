import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { pool } from "@/lib/db/pool";
import { exigirSesion, SESSION_COOKIE_NAME } from "@/lib/auth/guard";

const enviarMagicLinkMock = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/email/send-magic-link", () => ({
  enviarMagicLink: enviarMagicLinkMock,
}));

async function limpiar() {
  await pool.query("DELETE FROM consumos");
  await pool.query("DELETE FROM usuarios");
}

beforeEach(async () => {
  vi.clearAllMocks();
  await limpiar();
});

afterAll(async () => {
  await limpiar();
  await pool.end();
});

function cookieRequest(url: string, sessionToken?: string) {
  return new Request(url, {
    headers: sessionToken ? { cookie: `${SESSION_COOKIE_NAME}=${sessionToken}` } : {},
  });
}

/**
 * Cubre, a nivel de backend (lib/ + rutas API — ver research.md §10 sobre
 * alcance de testing automatizado), los acceptance scenarios de US1 en
 * spec.md que no son puramente de UI (esos quedan en quickstart.md
 * Escenario 1, validado manualmente en T059): #2, #4, #6, #8, #9, y la
 * base de #1/#3/#7 (rechazo/aceptación de sesión que las páginas usan
 * para decidir a dónde redirigir).
 */
describe("User Story 1 — autenticación y tablero (acceptance scenarios)", () => {
  it("un request sin sesión vigente no está autenticado (escenario 1)", async () => {
    const resultado = await exigirSesion(cookieRequest("http://localhost/api/resumen-dia?fecha=2026-08-26"));
    expect(resultado.autenticado).toBe(false);
  });

  it("solicitar un magic link envía un email de un solo uso (escenario 2, FR-003a)", async () => {
    const { POST } = await import("@/app/api/auth/magic-link/route");
    const email = "nuevo-usuario@example.com";

    const response = await POST(
      new Request("http://localhost/api/auth/magic-link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      })
    );

    expect(response.status).toBe(200);
    expect(enviarMagicLinkMock).toHaveBeenCalledTimes(1);

    const { rows } = await pool.query("SELECT * FROM usuarios WHERE email = $1", [email]);
    expect(rows).toHaveLength(1);
    expect(rows[0].magic_link_token_hash).not.toBeNull();
  });

  it("abrir el link autentica y permite acceder al tablero (escenario 3)", async () => {
    const { POST: solicitar } = await import("@/app/api/auth/magic-link/route");
    await solicitar(
      new Request("http://localhost/api/auth/magic-link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "escenario3@example.com" }),
      })
    );
    const link: string = enviarMagicLinkMock.mock.calls[0][1];
    const token = new URL(link).searchParams.get("token")!;

    const { GET: verificar } = await import("@/app/api/auth/verify/route");
    const verifyResponse = await verificar(new Request(`http://localhost/api/auth/verify?token=${token}`));
    expect(verifyResponse.status).toBe(302);

    const setCookie = verifyResponse.headers.get("set-cookie")!;
    const sessionToken = /nutrashot_session=([^;]+)/.exec(setCookie)![1];

    const resultado = await exigirSesion(cookieRequest("http://localhost/api/resumen-dia?fecha=2026-08-26", sessionToken));
    expect(resultado.autenticado).toBe(true);
  });

  it("un link usado o expirado se rechaza y exige solicitar uno nuevo (escenario 4)", async () => {
    const { emitirMagicLink } = await import("@/lib/auth/magic-link");
    const { GET: verificar } = await import("@/app/api/auth/verify/route");

    const { token: tokenUsado } = await emitirMagicLink("usado-us1@example.com");
    await verificar(new Request(`http://localhost/api/auth/verify?token=${tokenUsado}`));
    const segundoIntento = await verificar(new Request(`http://localhost/api/auth/verify?token=${tokenUsado}`));
    expect(segundoIntento.status).toBe(401);

    const { token: tokenExpirado } = await emitirMagicLink("expirado-us1@example.com");
    await pool.query(
      "UPDATE usuarios SET magic_link_expires_at = now() - interval '1 minute' WHERE email = $1",
      ["expirado-us1@example.com"]
    );
    const intentoExpirado = await verificar(new Request(`http://localhost/api/auth/verify?token=${tokenExpirado}`));
    expect(intentoExpirado.status).toBe(401);
  });

  it("solicitar un segundo link invalida el primero no usado (FR-004a)", async () => {
    const { emitirMagicLink } = await import("@/lib/auth/magic-link");
    const { GET: verificar } = await import("@/app/api/auth/verify/route");

    const { token: primerToken } = await emitirMagicLink("reemision-us1@example.com");
    await emitirMagicLink("reemision-us1@example.com");

    const respuesta = await verificar(new Request(`http://localhost/api/auth/verify?token=${primerToken}`));
    expect(respuesta.status).toBe(401);
  });

  it("una sesión inactiva por 24h exige volver a autenticarse (escenario 6, FR-006)", async () => {
    const { emitirMagicLink } = await import("@/lib/auth/magic-link");
    const { GET: verificar } = await import("@/app/api/auth/verify/route");

    const { token } = await emitirMagicLink("inactivo-us1@example.com");
    const verifyResponse = await verificar(new Request(`http://localhost/api/auth/verify?token=${token}`));
    const setCookie = verifyResponse.headers.get("set-cookie")!;
    const sessionToken = /nutrashot_session=([^;]+)/.exec(setCookie)![1];

    await pool.query(
      "UPDATE usuarios SET session_last_activity_at = now() - interval '24 hours 1 minute' WHERE email = $1",
      ["inactivo-us1@example.com"]
    );

    const resultado = await exigirSesion(cookieRequest("http://localhost/api/resumen-dia?fecha=2026-08-26", sessionToken));
    expect(resultado.autenticado).toBe(false);
  });

  it("cerrar sesión finaliza la sesión activa (escenario 7)", async () => {
    const { emitirMagicLink } = await import("@/lib/auth/magic-link");
    const { GET: verificar } = await import("@/app/api/auth/verify/route");
    const { POST: logout } = await import("@/app/api/auth/logout/route");

    const { token } = await emitirMagicLink("logout-us1@example.com");
    const verifyResponse = await verificar(new Request(`http://localhost/api/auth/verify?token=${token}`));
    const setCookie = verifyResponse.headers.get("set-cookie")!;
    const sessionToken = /nutrashot_session=([^;]+)/.exec(setCookie)![1];

    const logoutResponse = await logout(cookieRequest("http://localhost/api/auth/logout", sessionToken));
    expect(logoutResponse.status).toBe(200);

    const resultado = await exigirSesion(cookieRequest("http://localhost/api/resumen-dia?fecha=2026-08-26", sessionToken));
    expect(resultado.autenticado).toBe(false);
  });

  it("un email nuevo crea la cuenta automáticamente, sin registro separado (escenario 8, FR-003a)", async () => {
    const { POST } = await import("@/app/api/auth/magic-link/route");
    const email = "cuenta-automatica@example.com";

    const antes = await pool.query("SELECT * FROM usuarios WHERE email = $1", [email]);
    expect(antes.rows).toHaveLength(0);

    await POST(
      new Request("http://localhost/api/auth/magic-link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      })
    );

    const despues = await pool.query("SELECT * FROM usuarios WHERE email = $1", [email]);
    expect(despues.rows).toHaveLength(1);
  });

  it("sin consumos cargados el tablero del día muestra todo en cero (escenario 9, FR-009)", async () => {
    const { emitirMagicLink, validarMagicLink } = await import("@/lib/auth/magic-link");
    const { crearSesion } = await import("@/lib/auth/session");
    const { GET: resumenDia } = await import("@/app/api/resumen-dia/route");

    const { token: magicToken } = await emitirMagicLink("tablero-vacio@example.com");
    const validacion = await validarMagicLink(magicToken);
    if (!validacion.valido) throw new Error("fixture inválido");
    const { token: sessionToken } = await crearSesion(validacion.usuarioId);

    const response = await resumenDia(
      cookieRequest(
        "http://localhost/api/resumen-dia?desde=2026-08-26T00:00:00.000Z&hasta=2026-08-27T00:00:00.000Z",
        sessionToken
      )
    );
    const body = await response.json();

    expect(body).toEqual({
      totalCalorias: 0,
      desglose: { carbohidratos: 0, proteinas: 0, grasas: 0, otrosNutrientes: 0 },
    });
  });
});
