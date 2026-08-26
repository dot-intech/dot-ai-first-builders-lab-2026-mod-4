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

function requestDelete(id: string, sessionToken?: string) {
  return new Request(`http://localhost/api/consumos/${id}`, {
    method: "DELETE",
    headers: sessionToken ? { cookie: `nutrashot_session=${sessionToken}` } : {},
  });
}

describe("DELETE /api/consumos/:id", () => {
  it("200 al eliminar un consumo propio", async () => {
    const { token, usuarioId } = await crearSesionDePrueba("delete-propio@example.com");
    const { rows } = await pool.query(
      `INSERT INTO consumos (usuario_id, descripcion, calorias, pct_carbohidratos, pct_proteinas, pct_grasas, pct_otros_nutrientes)
       VALUES ($1, 'Milanesa', 650, 40, 30, 20, 10) RETURNING id`,
      [usuarioId]
    );
    const id = rows[0].id;

    const { DELETE } = await import("@/app/api/consumos/[id]/route");
    const response = await DELETE(requestDelete(id, token), { params: Promise.resolve({ id }) });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ ok: true });

    const { rows: restantes } = await pool.query("SELECT id FROM consumos WHERE id = $1", [id]);
    expect(restantes).toHaveLength(0);
  });

  it("404 si el consumo no existe", async () => {
    const { token } = await crearSesionDePrueba("delete-inexistente@example.com");
    const idInexistente = "00000000-0000-0000-0000-000000000000";

    const { DELETE } = await import("@/app/api/consumos/[id]/route");
    const response = await DELETE(requestDelete(idInexistente, token), {
      params: Promise.resolve({ id: idInexistente }),
    });

    expect(response.status).toBe(404);
  });

  it("404 si el consumo pertenece a otro usuario", async () => {
    const { usuarioId: usuarioAjeno } = await crearSesionDePrueba("delete-dueno@example.com");
    const { rows } = await pool.query(
      `INSERT INTO consumos (usuario_id, descripcion, calorias, pct_carbohidratos, pct_proteinas, pct_grasas, pct_otros_nutrientes)
       VALUES ($1, 'Ajeno', 500, 25, 25, 25, 25) RETURNING id`,
      [usuarioAjeno]
    );
    const id = rows[0].id;

    const { token } = await crearSesionDePrueba("delete-atacante@example.com");
    const { DELETE } = await import("@/app/api/consumos/[id]/route");
    const response = await DELETE(requestDelete(id, token), { params: Promise.resolve({ id }) });

    expect(response.status).toBe(404);
  });

  it("401 sin sesión", async () => {
    const { DELETE } = await import("@/app/api/consumos/[id]/route");
    const id = "00000000-0000-0000-0000-000000000000";
    const response = await DELETE(requestDelete(id), { params: Promise.resolve({ id }) });
    expect(response.status).toBe(401);
  });
});
