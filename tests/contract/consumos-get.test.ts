import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { pool } from "@/lib/db/pool";
import { emitirMagicLink, validarMagicLink } from "@/lib/auth/magic-link";
import { crearSesion } from "@/lib/auth/session";

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

async function crearSesionDePrueba(email: string) {
  const { token: magicToken } = await emitirMagicLink(email);
  const validacion = await validarMagicLink(magicToken);
  if (!validacion.valido) throw new Error("fixture inválido");
  const { token } = await crearSesion(validacion.usuarioId);
  return { token, usuarioId: validacion.usuarioId };
}

describe("GET /api/consumos", () => {
  it("200 con la lista propia ordenada descendente", async () => {
    const { token, usuarioId } = await crearSesionDePrueba("historial-get@example.com");

    await pool.query(
      `INSERT INTO consumos (usuario_id, fecha_hora, descripcion, calorias, pct_carbohidratos, pct_proteinas, pct_grasas, pct_otros_nutrientes)
       VALUES ($1, '2026-08-20T12:00:00Z', 'Ensalada', 300, 25, 25, 25, 25)`,
      [usuarioId]
    );
    await pool.query(
      `INSERT INTO consumos (usuario_id, fecha_hora, descripcion, calorias, pct_carbohidratos, pct_proteinas, pct_grasas, pct_otros_nutrientes)
       VALUES ($1, '2026-08-25T12:00:00Z', 'Milanesa', 650, 40, 30, 20, 10)`,
      [usuarioId]
    );

    const { GET } = await import("@/app/api/consumos/route");
    const response = await GET(
      new Request("http://localhost/api/consumos", { headers: { cookie: `nutrashot_session=${token}` } })
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.consumos).toHaveLength(2);
    expect(body.consumos[0].descripcion).toBe("Milanesa");
    expect(body.consumos[1].descripcion).toBe("Ensalada");
  });

  it("array vacío si no hay consumos", async () => {
    const { token } = await crearSesionDePrueba("historial-vacio@example.com");
    const { GET } = await import("@/app/api/consumos/route");
    const response = await GET(
      new Request("http://localhost/api/consumos", { headers: { cookie: `nutrashot_session=${token}` } })
    );
    const body = await response.json();
    expect(body.consumos).toEqual([]);
  });

  it("401 sin sesión", async () => {
    const { GET } = await import("@/app/api/consumos/route");
    const response = await GET(new Request("http://localhost/api/consumos"));
    expect(response.status).toBe(401);
  });
});
