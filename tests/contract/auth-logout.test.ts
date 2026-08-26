import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { pool } from "@/lib/db/pool";
import { emitirMagicLink, validarMagicLink } from "@/lib/auth/magic-link";
import { crearSesion, validarSesion } from "@/lib/auth/session";

async function limpiar() {
  await pool.query("DELETE FROM consumos");
  await pool.query("DELETE FROM usuarios");
}

beforeEach(async () => {
  await limpiar();
});

afterAll(async () => {
  await limpiar();
  await pool.end();
});

describe("POST /api/auth/logout", () => {
  it("200, limpia la cookie y la sesión en DB", async () => {
    const { token: magicToken } = await emitirMagicLink("logout@example.com");
    const validacion = await validarMagicLink(magicToken);
    if (!validacion.valido) throw new Error("fixture inválido");
    const { token: sessionToken } = await crearSesion(validacion.usuarioId);

    const { POST } = await import("@/app/api/auth/logout/route");
    const request = new Request("http://localhost/api/auth/logout", {
      method: "POST",
      headers: { cookie: `nutrashot_session=${sessionToken}` },
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ ok: true });

    const resultado = await validarSesion(sessionToken);
    expect(resultado.valido).toBe(false);
  });

  it("401 sin sesión válida (regla general de contracts/api.md)", async () => {
    const { POST } = await import("@/app/api/auth/logout/route");
    const request = new Request("http://localhost/api/auth/logout", { method: "POST" });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });
});
