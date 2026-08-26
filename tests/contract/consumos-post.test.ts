import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
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

const desgloseValido = { carbohidratos: 40, proteinas: 30, grasas: 20, otrosNutrientes: 10 };

function requestPost(body: unknown, sessionToken?: string) {
  return new Request("http://localhost/api/consumos", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(sessionToken ? { cookie: `nutrashot_session=${sessionToken}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/consumos", () => {
  it("201 al guardar un consumo válido", async () => {
    const { token } = await crearSesionDePrueba("guardar-consumo@example.com");
    const { POST } = await import("@/app/api/consumos/route");

    const response = await POST(
      requestPost({ descripcion: "Milanesa con puré", calorias: 650, desglose: desgloseValido }, token)
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.id).toBeDefined();
    expect(body.fechaHora).toBeDefined();
  });

  it("400 si las calorías son negativas", async () => {
    const { token } = await crearSesionDePrueba("calorias-negativas@example.com");
    const { POST } = await import("@/app/api/consumos/route");
    const response = await POST(requestPost({ descripcion: "X", calorias: -5, desglose: desgloseValido }, token));
    expect(response.status).toBe(400);
  });

  it("400 si el desglose no suma 100", async () => {
    const { token } = await crearSesionDePrueba("desglose-mal@example.com");
    const { POST } = await import("@/app/api/consumos/route");
    const response = await POST(
      requestPost(
        { descripcion: "X", calorias: 100, desglose: { carbohidratos: 10, proteinas: 10, grasas: 10, otrosNutrientes: 10 } },
        token
      )
    );
    expect(response.status).toBe(400);
  });

  it("400 si la descripción está vacía", async () => {
    const { token } = await crearSesionDePrueba("descripcion-vacia@example.com");
    const { POST } = await import("@/app/api/consumos/route");
    const response = await POST(requestPost({ descripcion: "", calorias: 100, desglose: desgloseValido }, token));
    expect(response.status).toBe(400);
  });

  it("400 si la descripción supera los 120 caracteres", async () => {
    const { token } = await crearSesionDePrueba("descripcion-larga@example.com");
    const { POST } = await import("@/app/api/consumos/route");
    const response = await POST(
      requestPost({ descripcion: "a".repeat(121), calorias: 100, desglose: desgloseValido }, token)
    );
    expect(response.status).toBe(400);
  });

  it("401 sin sesión", async () => {
    const { POST } = await import("@/app/api/consumos/route");
    const response = await POST(requestPost({ descripcion: "X", calorias: 100, desglose: desgloseValido }));
    expect(response.status).toBe(401);
  });

  it("500 si falla el guardado (red/DB)", async () => {
    const { token } = await crearSesionDePrueba("falla-guardado@example.com");

    const queryOriginal = pool.query.bind(pool);
    vi.spyOn(pool, "query").mockImplementation(((...args: Parameters<typeof pool.query>) => {
      const sql = args[0];
      if (typeof sql === "string" && sql.includes("INSERT INTO consumos")) {
        return Promise.reject(new Error("conexión perdida"));
      }
      return queryOriginal(...args);
    }) as typeof pool.query);

    const { POST } = await import("@/app/api/consumos/route");
    const response = await POST(
      requestPost({ descripcion: "Milanesa", calorias: 650, desglose: desgloseValido }, token)
    );

    expect(response.status).toBe(500);
    vi.restoreAllMocks();
  });
});
