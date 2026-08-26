import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { pool } from "@/lib/db/pool";
import {
  emitirMagicLink,
  invalidarMagicLink,
  validarMagicLink,
} from "@/lib/auth/magic-link";

async function limpiarUsuarios() {
  await pool.query("DELETE FROM consumos");
  await pool.query("DELETE FROM usuarios");
}

beforeEach(async () => {
  await limpiarUsuarios();
});

afterAll(async () => {
  await limpiarUsuarios();
  await pool.end();
});

describe("emitirMagicLink", () => {
  it("crea el usuario si el email no existía (FR-003a)", async () => {
    const email = "nuevo@example.com";
    await emitirMagicLink(email);

    const { rows } = await pool.query("SELECT * FROM usuarios WHERE email = $1", [email]);
    expect(rows).toHaveLength(1);
    expect(rows[0].magic_link_token_hash).not.toBeNull();
    expect(rows[0].magic_link_expires_at).not.toBeNull();
  });

  it("reutiliza el usuario existente si el email ya existía", async () => {
    const email = "existente@example.com";
    await emitirMagicLink(email);
    await emitirMagicLink(email);

    const { rows } = await pool.query("SELECT * FROM usuarios WHERE email = $1", [email]);
    expect(rows).toHaveLength(1);
  });

  it("invalida automáticamente el link previo no usado al reemitir (FR-004a)", async () => {
    const email = "reemite@example.com";
    const primero = await emitirMagicLink(email);
    await emitirMagicLink(email);

    const resultado = await validarMagicLink(primero.token);
    expect(resultado.valido).toBe(false);
  });
});

describe("validarMagicLink", () => {
  it("valida un link recién emitido y devuelve el usuario", async () => {
    const email = "valido@example.com";
    const { token } = await emitirMagicLink(email);

    const resultado = await validarMagicLink(token);
    expect(resultado.valido).toBe(true);
    if (resultado.valido) {
      expect(resultado.usuarioId).toBeDefined();
    }
  });

  it("un link usado no vuelve a aceptarse (FR-004)", async () => {
    const email = "usado@example.com";
    const { token } = await emitirMagicLink(email);

    const primeraValidacion = await validarMagicLink(token);
    expect(primeraValidacion.valido).toBe(true);

    const segundaValidacion = await validarMagicLink(token);
    expect(segundaValidacion.valido).toBe(false);
  });

  it("un link expirado (>15 min) se rechaza (FR-005)", async () => {
    const email = "expirado@example.com";
    const { token } = await emitirMagicLink(email);

    await pool.query(
      "UPDATE usuarios SET magic_link_expires_at = now() - interval '1 minute' WHERE email = $1",
      [email]
    );

    const resultado = await validarMagicLink(token);
    expect(resultado.valido).toBe(false);
  });

  it("un token inexistente se rechaza", async () => {
    const resultado = await validarMagicLink("token-que-no-existe");
    expect(resultado.valido).toBe(false);
  });
});

describe("invalidarMagicLink", () => {
  it("limpia el token vigente de un usuario", async () => {
    const email = "invalidar@example.com";
    const { usuarioId } = await emitirMagicLink(email);
    await invalidarMagicLink(usuarioId);

    const { rows } = await pool.query("SELECT magic_link_token_hash FROM usuarios WHERE id = $1", [usuarioId]);
    expect(rows[0].magic_link_token_hash).toBeNull();
  });
});
