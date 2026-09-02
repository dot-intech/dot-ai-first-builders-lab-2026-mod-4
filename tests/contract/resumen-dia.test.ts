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
  it("200 con ceros si no hay consumos en el rango recibido", async () => {
    const { token } = await crearSesionDePrueba("resumen-vacio@example.com");
    const { GET } = await import("@/app/api/resumen-dia/route");

    const request = new Request(
      "http://localhost/api/resumen-dia?desde=2026-08-26T00:00:00.000Z&hasta=2026-08-27T00:00:00.000Z",
      { headers: { cookie: `nutrashot_session=${token}` } }
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      totalCalorias: 0,
      desglose: { carbohidratos: 0, proteinas: 0, grasas: 0, otrosNutrientes: 0 },
    });
  });

  it("200 con agregados correctos cuando hay consumos en ese rango", async () => {
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
    const request = new Request(
      "http://localhost/api/resumen-dia?desde=2026-08-26T00:00:00.000Z&hasta=2026-08-27T00:00:00.000Z",
      { headers: { cookie: `nutrashot_session=${token}` } }
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.totalCalorias).toBe(600);
  });

  it("incluye un consumo cercano a la medianoche UTC cuando cae dentro del rango del día local (regresión bug zona horaria)", async () => {
    const { token, usuarioId } = await crearSesionDePrueba("resumen-timezone@example.com");

    // 2026-08-26T00:30:00Z: en UTC-3 esto es 2026-08-25 21:30 local, "hoy"
    // sigue siendo el 25. El rango desde/hasta ya viene resuelto en UTC
    // representando ese día local (25/8 00:00 -03:00 a 26/8 00:00 -03:00).
    await pool.query(
      `INSERT INTO consumos (usuario_id, fecha_hora, descripcion, calorias, pct_carbohidratos, pct_proteinas, pct_grasas, pct_otros_nutrientes)
       VALUES ($1, '2026-08-26T00:30:00Z', 'Café con leche', 200, 25, 25, 25, 25)`,
      [usuarioId]
    );

    const { GET } = await import("@/app/api/resumen-dia/route");
    const request = new Request(
      "http://localhost/api/resumen-dia?desde=2026-08-25T03:00:00.000Z&hasta=2026-08-26T03:00:00.000Z",
      { headers: { cookie: `nutrashot_session=${token}` } }
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.totalCalorias).toBe(200);
  });

  it("el límite superior del rango es exclusivo", async () => {
    const { token, usuarioId } = await crearSesionDePrueba("resumen-limite@example.com");

    await pool.query(
      `INSERT INTO consumos (usuario_id, fecha_hora, descripcion, calorias, pct_carbohidratos, pct_proteinas, pct_grasas, pct_otros_nutrientes)
       VALUES ($1, '2026-08-27T00:00:00Z', 'Justo al límite', 100, 25, 25, 25, 25)`,
      [usuarioId]
    );

    const { GET } = await import("@/app/api/resumen-dia/route");
    const request = new Request(
      "http://localhost/api/resumen-dia?desde=2026-08-26T00:00:00.000Z&hasta=2026-08-27T00:00:00.000Z",
      { headers: { cookie: `nutrashot_session=${token}` } }
    );
    const response = await GET(request);

    const body = await response.json();
    expect(body.totalCalorias).toBe(0);
  });

  it("400 si falta desde o hasta", async () => {
    const { token } = await crearSesionDePrueba("resumen-sin-rango@example.com");
    const { GET } = await import("@/app/api/resumen-dia/route");

    const sinHasta = await GET(
      new Request("http://localhost/api/resumen-dia?desde=2026-08-26T00:00:00.000Z", {
        headers: { cookie: `nutrashot_session=${token}` },
      })
    );
    expect(sinHasta.status).toBe(400);

    const sinDesde = await GET(
      new Request("http://localhost/api/resumen-dia?hasta=2026-08-27T00:00:00.000Z", {
        headers: { cookie: `nutrashot_session=${token}` },
      })
    );
    expect(sinDesde.status).toBe(400);
  });

  it("400 si desde/hasta no son fechas ISO válidas", async () => {
    const { token } = await crearSesionDePrueba("resumen-rango-invalido@example.com");
    const { GET } = await import("@/app/api/resumen-dia/route");

    const request = new Request("http://localhost/api/resumen-dia?desde=no-es-fecha&hasta=tampoco", {
      headers: { cookie: `nutrashot_session=${token}` },
    });
    const response = await GET(request);
    expect(response.status).toBe(400);
  });

  it("401 sin sesión", async () => {
    const { GET } = await import("@/app/api/resumen-dia/route");
    const request = new Request(
      "http://localhost/api/resumen-dia?desde=2026-08-26T00:00:00.000Z&hasta=2026-08-27T00:00:00.000Z"
    );
    const response = await GET(request);
    expect(response.status).toBe(401);
  });
});
