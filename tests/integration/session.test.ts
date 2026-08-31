import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { pool } from "@/lib/db/pool";
import { emitirMagicLink, validarMagicLink } from "@/lib/auth/magic-link";
import { cerrarSesion, crearSesion, validarSesion } from "@/lib/auth/session";
import { exigirSesion } from "@/lib/auth/guard";

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

async function crearUsuarioAutenticado(email: string) {
  const { token } = await emitirMagicLink(email);
  const resultado = await validarMagicLink(token);
  if (!resultado.valido) throw new Error("magic link inválido en fixture de test");
  return resultado.usuarioId;
}

describe("crearSesion / validarSesion", () => {
  it("validar un magic link permite crear una sesión activa", async () => {
    const usuarioId = await crearUsuarioAutenticado("sesion@example.com");
    const { token } = await crearSesion(usuarioId);

    const resultado = await validarSesion(token);
    expect(resultado.valido).toBe(true);
    if (resultado.valido) {
      expect(resultado.usuarioId).toBe(usuarioId);
    }
  });

  it("la sesión expira tras 24h de inactividad (FR-006)", async () => {
    const usuarioId = await crearUsuarioAutenticado("inactivo@example.com");
    const { token } = await crearSesion(usuarioId);

    await pool.query(
      "UPDATE usuarios SET session_last_activity_at = now() - interval '24 hours 1 minute' WHERE id = $1",
      [usuarioId]
    );

    const resultado = await validarSesion(token);
    expect(resultado.valido).toBe(false);
  });

  it("un token de sesión inexistente es rechazado", async () => {
    const resultado = await validarSesion("token-de-sesion-inexistente");
    expect(resultado.valido).toBe(false);
  });
});

describe("cerrarSesion", () => {
  it("limpia la sesión activa (FR-007)", async () => {
    const usuarioId = await crearUsuarioAutenticado("logout@example.com");
    const { token } = await crearSesion(usuarioId);

    await cerrarSesion(usuarioId);

    const resultado = await validarSesion(token);
    expect(resultado.valido).toBe(false);
  });
});

describe("exigirSesion (guard)", () => {
  it("rechaza un request sin cookie de sesión", async () => {
    const request = new Request("http://localhost/api/resumen-dia");
    const resultado = await exigirSesion(request);
    expect(resultado.autenticado).toBe(false);
  });

  it("rechaza un request con una cookie de sesión inválida", async () => {
    const request = new Request("http://localhost/api/resumen-dia", {
      headers: { cookie: "nutrashot_session=invalida" },
    });
    const resultado = await exigirSesion(request);
    expect(resultado.autenticado).toBe(false);
  });

  it("acepta un request con una cookie de sesión válida y expone el usuarioId", async () => {
    const usuarioId = await crearUsuarioAutenticado("guard@example.com");
    const { token } = await crearSesion(usuarioId);

    const request = new Request("http://localhost/api/resumen-dia", {
      headers: { cookie: `nutrashot_session=${token}` },
    });
    const resultado = await exigirSesion(request);
    expect(resultado.autenticado).toBe(true);
    if (resultado.autenticado) {
      expect(resultado.usuarioId).toBe(usuarioId);
    }
  });
});
