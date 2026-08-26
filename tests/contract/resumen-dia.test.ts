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

describe("GET /api/resumen-dia", () => {
  it("200 con ceros si no hay consumos para la fecha recibida", async () => {
    const { token } = await crearSesionDePrueba("resumen-vacio@example.com");
    const { GET } = await import("@/app/api/resumen-dia/route");

    const request = new Request("http://localhost/api/resumen-dia?fecha=2026-08-26", {
      headers: { cookie: `nutrashot_session=${token}` },
    });
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      totalCalorias: 0,
      desglose: { carbohidratos: 0, proteinas: 0, grasas: 0, otrosNutrientes: 0 },
    });
  });

  it("200 con agregados correctos cuando hay consumos en esa fecha", async () => {
    const { token, usuarioId } = await crearSesionDePrueba("resumen-con-datos@example.com");

    await pool.query(
      `INSERT INTO consumos (usuario_id, fecha_hora, descripcion, calorias, pct_carbohidratos, pct_proteinas, pct_grasas, pct_otros_nutrientes)
       VALUES ($1, '2026-08-26T12:00:00Z', 'Milanesa', 600, 40, 30, 20, 10)`,
      [usuarioId]
    );
    // Consumo de otro día — no debe contarse
    await pool.query(
      `INSERT INTO consumos (usuario_id, fecha_hora, descripcion, calorias, pct_carbohidratos, pct_proteinas, pct_grasas, pct_otros_nutrientes)
       VALUES ($1, '2026-08-20T12:00:00Z', 'Ensalada', 300, 25, 25, 25, 25)`,
      [usuarioId]
    );

    const { GET } = await import("@/app/api/resumen-dia/route");
    const request = new Request("http://localhost/api/resumen-dia?fecha=2026-08-26", {
      headers: { cookie: `nutrashot_session=${token}` },
    });
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.totalCalorias).toBe(600);
  });

  it("400 si falta el parámetro fecha", async () => {
    const { token } = await crearSesionDePrueba("resumen-sin-fecha@example.com");
    const { GET } = await import("@/app/api/resumen-dia/route");
    const request = new Request("http://localhost/api/resumen-dia", {
      headers: { cookie: `nutrashot_session=${token}` },
    });
    const response = await GET(request);
    expect(response.status).toBe(400);
  });

  it("401 sin sesión", async () => {
    const { GET } = await import("@/app/api/resumen-dia/route");
    const request = new Request("http://localhost/api/resumen-dia?fecha=2026-08-26");
    const response = await GET(request);
    expect(response.status).toBe(401);
  });
});
