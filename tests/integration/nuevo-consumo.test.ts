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

async function crearSesionDePrueba(email: string) {
  const { token: magicToken } = await emitirMagicLink(email);
  const validacion = await validarMagicLink(magicToken);
  if (!validacion.valido) throw new Error("fixture inválido");
  const { token } = await crearSesion(validacion.usuarioId);
  return token;
}

function requestConImagen(sessionToken: string) {
  const form = new FormData();
  form.set("imagen", new File([new Uint8Array([1, 2, 3]) as BlobPart], "plato.jpg", { type: "image/jpeg" }));
  return new Request("http://localhost/api/consumos/analizar", {
    method: "POST",
    headers: { cookie: `nutrashot_session=${sessionToken}` },
    body: form,
  });
}

function requestGuardar(body: unknown, sessionToken: string) {
  return new Request("http://localhost/api/consumos", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: `nutrashot_session=${sessionToken}` },
    body: JSON.stringify(body),
  });
}

/**
 * Cubre, a nivel de backend, los acceptance scenarios de US2 observables
 * sin renderizar UI (ver research.md §10 y la nota equivalente en
 * tests/integration/auth-dashboard.test.ts). Los escenarios puramente de
 * interfaz — indicador de procesamiento (#1), nota de inexactitud (#4),
 * bloqueo de guardado por baja confianza (#5), edición en pantalla (#6),
 * y no perder los datos en pantalla tras cancelar/reintentar (#9, #11) —
 * quedan cubiertos manualmente por quickstart.md Escenario 2 (T059).
 */
describe("User Story 2 — registrar un consumo por foto (acceptance scenarios)", () => {
  it("el análisis responde en menos de 10s con latencia representativa del modelo (escenario 2/3, FR-022/SC-001)", async () => {
    analizarImagenMock.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                identificado: true,
                descripcion: "Milanesa con puré",
                calorias: 650,
                desglose: { carbohidratos: 40, proteinas: 30, grasas: 20, otrosNutrientes: 10 },
                confianza: 0.85,
              }),
            2000
          )
        )
    );

    const token = await crearSesionDePrueba("timing@example.com");
    const { POST: analizar } = await import("@/app/api/consumos/analizar/route");

    const inicio = Date.now();
    const response = await analizar(requestConImagen(token));
    const duracionMs = Date.now() - inicio;

    expect(response.status).toBe(200);
    expect(duracionMs).toBeLessThan(10_000);
  });

  it("guardar un consumo actualiza el tablero del día al instante (escenario 8, FR-012)", async () => {
    analizarImagenMock.mockResolvedValue({
      identificado: true,
      descripcion: "Milanesa con puré",
      calorias: 650,
      desglose: { carbohidratos: 40, proteinas: 30, grasas: 20, otrosNutrientes: 10 },
      confianza: 0.85,
    });

    const token = await crearSesionDePrueba("actualiza-tablero@example.com");
    const { POST: analizar } = await import("@/app/api/consumos/analizar/route");
    const { POST: guardar } = await import("@/app/api/consumos/route");
    const { GET: resumenDia } = await import("@/app/api/resumen-dia/route");

    const estimacion = await (await analizar(requestConImagen(token))).json();
    const guardadoResponse = await guardar(requestGuardar(estimacion, token));
    expect(guardadoResponse.status).toBe(201);

    const hoy = new Date().toISOString().slice(0, 10);
    const resumenResponse = await resumenDia(
      new Request(`http://localhost/api/resumen-dia?fecha=${hoy}`, {
        headers: { cookie: `nutrashot_session=${token}` },
      })
    );
    const resumen = await resumenResponse.json();
    expect(resumen.totalCalorias).toBe(650);
  });

  it("un análisis que falla no bloquea guardar manualmente con la misma validación (escenario 7, FR-021/FR-023)", async () => {
    analizarImagenMock.mockRejectedValue(new Error("el modelo no respondió"));

    const token = await crearSesionDePrueba("analisis-falla@example.com");
    const { POST: analizar } = await import("@/app/api/consumos/analizar/route");
    const { POST: guardar } = await import("@/app/api/consumos/route");

    await expect(analizar(requestConImagen(token))).rejects.toThrow();

    const cargaManual = {
      descripcion: "Sandwich de jamón y queso",
      calorias: 400,
      desglose: { carbohidratos: 40, proteinas: 25, grasas: 25, otrosNutrientes: 10 },
    };
    const response = await guardar(requestGuardar(cargaManual, token));
    expect(response.status).toBe(201);
  });

  it("un fallo de guardado no deja estado corrupto: reintentar el mismo POST guarda un único consumo (escenario 11, FR-024a)", async () => {
    const token = await crearSesionDePrueba("reintento@example.com");
    const { POST: guardar } = await import("@/app/api/consumos/route");

    const consumo = {
      descripcion: "Milanesa con puré",
      calorias: 650,
      desglose: { carbohidratos: 40, proteinas: 30, grasas: 20, otrosNutrientes: 10 },
    };

    const queryOriginal = pool.query.bind(pool);
    let fallarInsert = true;
    const spy = vi.spyOn(pool, "query").mockImplementation(((...args: Parameters<typeof pool.query>) => {
      const sql = args[0];
      if (fallarInsert && typeof sql === "string" && sql.includes("INSERT INTO consumos")) {
        return Promise.reject(new Error("conexión perdida"));
      }
      return queryOriginal(...args);
    }) as typeof pool.query);

    const primerIntento = await guardar(requestGuardar(consumo, token));
    expect(primerIntento.status).toBe(500);
    fallarInsert = false;
    spy.mockRestore();

    const segundoIntento = await guardar(requestGuardar(consumo, token));
    expect(segundoIntento.status).toBe(201);

    const { rows } = await pool.query("SELECT count(*) FROM consumos WHERE descripcion = $1", [consumo.descripcion]);
    expect(Number(rows[0].count)).toBe(1);
  });
});
