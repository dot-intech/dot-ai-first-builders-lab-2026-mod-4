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

/**
 * Escenario #5 (sin opción de editar) es un hecho de UI/contrato: la API no
 * expone PUT/PATCH /api/consumos/:id (ver contracts/api.md), por lo que no
 * hay endpoint que un cliente pueda usar para editar — se verifica acá
 * indirectamente confirmando que sólo existen GET/POST/DELETE.
 */
describe("User Story 4 — historial de consumos (acceptance scenarios)", () => {
  it("sólo devuelve los consumos propios, cada uno con fecha/hora y calorías (escenario 1)", async () => {
    const { token, usuarioId } = await crearSesionDePrueba("historial-propio@example.com");
    const { usuarioId: otroUsuarioId } = await crearSesionDePrueba("historial-otro@example.com");

    await pool.query(
      `INSERT INTO consumos (usuario_id, descripcion, calorias, pct_carbohidratos, pct_proteinas, pct_grasas, pct_otros_nutrientes)
       VALUES ($1, 'Mío', 500, 25, 25, 25, 25)`,
      [usuarioId]
    );
    await pool.query(
      `INSERT INTO consumos (usuario_id, descripcion, calorias, pct_carbohidratos, pct_proteinas, pct_grasas, pct_otros_nutrientes)
       VALUES ($1, 'Ajeno', 500, 25, 25, 25, 25)`,
      [otroUsuarioId]
    );

    const { GET } = await import("@/app/api/consumos/route");
    const response = await GET(
      new Request("http://localhost/api/consumos", { headers: { cookie: `nutrashot_session=${token}` } })
    );
    const body = await response.json();

    expect(body.consumos).toHaveLength(1);
    expect(body.consumos[0].descripcion).toBe("Mío");
    expect(body.consumos[0].fechaHora).toBeDefined();
    expect(body.consumos[0].calorias).toBeDefined();
  });

  it("los consumos aparecen ordenados por fecha y hora en forma descendente (escenario 2)", async () => {
    const { token, usuarioId } = await crearSesionDePrueba("historial-orden@example.com");

    const fechas = ["2025-01-15T10:00:00Z", "2026-08-25T10:00:00Z", "2026-03-10T10:00:00Z"];
    for (const [i, fecha] of fechas.entries()) {
      await pool.query(
        `INSERT INTO consumos (usuario_id, fecha_hora, descripcion, calorias, pct_carbohidratos, pct_proteinas, pct_grasas, pct_otros_nutrientes)
         VALUES ($1, $2, $3, 100, 25, 25, 25, 25)`,
        [usuarioId, fecha, `Consumo ${i}`]
      );
    }

    const { GET } = await import("@/app/api/consumos/route");
    const response = await GET(
      new Request("http://localhost/api/consumos", { headers: { cookie: `nutrashot_session=${token}` } })
    );
    const body = await response.json();

    const fechasOrdenadas = body.consumos.map((c: { fechaHora: string }) => c.fechaHora);
    const copiaOrdenada = [...fechasOrdenadas].sort().reverse();
    expect(fechasOrdenadas).toEqual(copiaOrdenada);
  });

  it("acceder a un consumo de otro usuario es denegado sin exponer sus datos (escenario 3, FR-035)", async () => {
    const { usuarioId: usuarioAjeno } = await crearSesionDePrueba("historial-ajeno@example.com");
    const { rows } = await pool.query(
      `INSERT INTO consumos (usuario_id, descripcion, calorias, pct_carbohidratos, pct_proteinas, pct_grasas, pct_otros_nutrientes)
       VALUES ($1, 'Secreto', 500, 25, 25, 25, 25) RETURNING id`,
      [usuarioAjeno]
    );
    const idAjeno = rows[0].id;

    const { token } = await crearSesionDePrueba("historial-atacante@example.com");
    const { DELETE } = await import("@/app/api/consumos/[id]/route");
    const response = await DELETE(
      new Request(`http://localhost/api/consumos/${idAjeno}`, {
        method: "DELETE",
        headers: { cookie: `nutrashot_session=${token}` },
      }),
      { params: Promise.resolve({ id: idAjeno }) }
    );

    expect(response.status).toBe(404);
    const { rows: siguenExistiendo } = await pool.query("SELECT id FROM consumos WHERE id = $1", [idAjeno]);
    expect(siguenExistiendo).toHaveLength(1);
  });

  it("sin consumos cargados, el listado es un array vacío para que la UI muestre el estado vacío (escenario 4)", async () => {
    const { token } = await crearSesionDePrueba("historial-sin-datos@example.com");
    const { GET } = await import("@/app/api/consumos/route");
    const response = await GET(
      new Request("http://localhost/api/consumos", { headers: { cookie: `nutrashot_session=${token}` } })
    );
    const body = await response.json();
    expect(body.consumos).toEqual([]);
  });

  it("no existe ruta de edición para un consumo guardado (escenario 5, FR-034a)", async () => {
    const routeModule = await import("@/app/api/consumos/[id]/route");
    expect((routeModule as Record<string, unknown>).PUT).toBeUndefined();
    expect((routeModule as Record<string, unknown>).PATCH).toBeUndefined();
  });
});
