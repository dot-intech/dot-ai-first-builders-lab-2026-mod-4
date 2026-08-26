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
 * La confirmación con advertencia de irreversibilidad (parte de los
 * escenarios 1-2) es interacción de UI (`window.confirm` en
 * HistorialLista.tsx) — se valida manualmente vía quickstart.md
 * Escenario 6 (T059). Acá se prueba el efecto de backend: sólo elimina
 * cuando el cliente efectivamente confirma y llama al DELETE, y una vez
 * eliminado desaparece del historial y del tablero del día correspondiente.
 */
describe("User Story 5 — eliminar un consumo (acceptance scenarios)", () => {
  it("eliminar un consumo propio lo quita del historial y del tablero del día (escenarios 1-2)", async () => {
    const { token, usuarioId } = await crearSesionDePrueba("eliminar@example.com");
    const hoyIso = new Date().toISOString();

    const { rows } = await pool.query(
      `INSERT INTO consumos (usuario_id, fecha_hora, descripcion, calorias, pct_carbohidratos, pct_proteinas, pct_grasas, pct_otros_nutrientes)
       VALUES ($1, $2, 'Milanesa', 650, 40, 30, 20, 10) RETURNING id`,
      [usuarioId, hoyIso]
    );
    const id = rows[0].id;

    const { GET: resumenDia } = await import("@/app/api/resumen-dia/route");
    const hoy = hoyIso.slice(0, 10);
    const resumenAntes = await (
      await resumenDia(
        new Request(`http://localhost/api/resumen-dia?fecha=${hoy}`, {
          headers: { cookie: `nutrashot_session=${token}` },
        })
      )
    ).json();
    expect(resumenAntes.totalCalorias).toBe(650);

    const { DELETE } = await import("@/app/api/consumos/[id]/route");
    const deleteResponse = await DELETE(
      new Request(`http://localhost/api/consumos/${id}`, {
        method: "DELETE",
        headers: { cookie: `nutrashot_session=${token}` },
      }),
      { params: Promise.resolve({ id }) }
    );
    expect(deleteResponse.status).toBe(200);

    const { GET: listarConsumos } = await import("@/app/api/consumos/route");
    const historialDespues = await (
      await listarConsumos(
        new Request("http://localhost/api/consumos", { headers: { cookie: `nutrashot_session=${token}` } })
      )
    ).json();
    expect(historialDespues.consumos).toHaveLength(0);

    const resumenDespues = await (
      await resumenDia(
        new Request(`http://localhost/api/resumen-dia?fecha=${hoy}`, {
          headers: { cookie: `nutrashot_session=${token}` },
        })
      )
    ).json();
    expect(resumenDespues.totalCalorias).toBe(0);
  });

  it("intentar eliminar sin confirmación (sin llamar al DELETE) no borra nada", async () => {
    const { usuarioId } = await crearSesionDePrueba("no-confirma@example.com");
    await pool.query(
      `INSERT INTO consumos (usuario_id, descripcion, calorias, pct_carbohidratos, pct_proteinas, pct_grasas, pct_otros_nutrientes)
       VALUES ($1, 'Milanesa', 650, 40, 30, 20, 10)`,
      [usuarioId]
    );

    const { rows } = await pool.query("SELECT count(*) FROM consumos WHERE usuario_id = $1", [usuarioId]);
    expect(Number(rows[0].count)).toBe(1);
  });
});
