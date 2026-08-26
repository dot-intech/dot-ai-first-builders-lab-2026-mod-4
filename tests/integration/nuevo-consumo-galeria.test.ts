import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pool } from "@/lib/db/pool";
import { emitirMagicLink, validarMagicLink } from "@/lib/auth/magic-link";
import { crearSesion } from "@/lib/auth/session";

const analizarImagenMock = vi.fn();
vi.mock("@/lib/ai/vision", () => ({
  analizarImagen: analizarImagenMock,
}));

async function limpiar() {
  await pool.query("DELETE FROM consumos");
  await pool.query("DELETE FROM usuarios");
}

beforeEach(async () => {
  vi.clearAllMocks();
  await limpiar();
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await limpiar();
  await pool.end();
});

/**
 * El backend (POST /api/consumos/analizar y POST /api/consumos) no
 * distingue si la imagen vino de cámara o de galería — es la misma ruta
 * y el mismo flujo (research.md, plan.md). Este test prueba justamente
 * eso: una imagen "de galería" (misma forma de request, sin ninguna
 * marca especial) sigue el idéntico análisis/revisión/guardado que US2,
 * y el consumo resultante queda guardado igual que uno de cámara. La
 * diferencia de UI (selector cámara/galería) se valida manualmente vía
 * quickstart.md Escenario 4 (T059).
 */
describe("User Story 3 — registrar un consumo desde la galería (acceptance scenarios)", () => {
  it("una imagen de galería sigue el mismo análisis/revisión/guardado que US2 (escenario 1)", async () => {
    analizarImagenMock.mockResolvedValue({
      identificado: true,
      descripcion: "Ensalada de quinoa",
      calorias: 380,
      desglose: { carbohidratos: 45, proteinas: 20, grasas: 25, otrosNutrientes: 10 },
      confianza: 0.88,
    });

    const { token: magicToken } = await emitirMagicLink("galeria@example.com");
    const validacion = await validarMagicLink(magicToken);
    if (!validacion.valido) throw new Error("fixture inválido");
    const { token } = await crearSesion(validacion.usuarioId);

    const { POST: analizar } = await import("@/app/api/consumos/analizar/route");
    const { POST: guardar } = await import("@/app/api/consumos/route");

    const form = new FormData();
    form.set("imagen", new File([new Uint8Array([9, 9, 9]) as BlobPart], "galeria.jpg", { type: "image/jpeg" }));
    const analisisResponse = await analizar(
      new Request("http://localhost/api/consumos/analizar", {
        method: "POST",
        headers: { cookie: `nutrashot_session=${token}` },
        body: form,
      })
    );
    expect(analisisResponse.status).toBe(200);
    const estimacion = await analisisResponse.json();

    const guardadoResponse = await guardar(
      new Request("http://localhost/api/consumos", {
        method: "POST",
        headers: { "content-type": "application/json", cookie: `nutrashot_session=${token}` },
        body: JSON.stringify(estimacion),
      })
    );
    expect(guardadoResponse.status).toBe(201);
  });

  it("el consumo queda guardado en la bitácora igual que uno originado en cámara (escenario 2)", async () => {
    const { token: magicToken } = await emitirMagicLink("galeria-bitacora@example.com");
    const validacion = await validarMagicLink(magicToken);
    if (!validacion.valido) throw new Error("fixture inválido");
    const { token, usuarioId } = { token: (await crearSesion(validacion.usuarioId)).token, usuarioId: validacion.usuarioId };

    const { POST: guardar } = await import("@/app/api/consumos/route");
    const consumo = {
      descripcion: "Ensalada de quinoa",
      calorias: 380,
      desglose: { carbohidratos: 45, proteinas: 20, grasas: 25, otrosNutrientes: 10 },
    };

    await guardar(
      new Request("http://localhost/api/consumos", {
        method: "POST",
        headers: { "content-type": "application/json", cookie: `nutrashot_session=${token}` },
        body: JSON.stringify(consumo),
      })
    );

    const { rows } = await pool.query(
      "SELECT descripcion, calorias FROM consumos WHERE usuario_id = $1",
      [usuarioId]
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].descripcion).toBe(consumo.descripcion);
  });
});
