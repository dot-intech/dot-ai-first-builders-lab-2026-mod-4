import { beforeEach, describe, expect, it, vi } from "vitest";

const analizarImagenMock = vi.fn();
vi.mock("@/lib/ai/vision", () => ({
  analizarImagen: analizarImagenMock,
  RespuestaInvalidaError: class RespuestaInvalidaError extends Error {},
}));

function requestConImagen(bytes: Uint8Array, mimeType: string, nombreCampo = "imagen") {
  const form = new FormData();
  form.set(nombreCampo, new File([bytes as BlobPart], "plato.jpg", { type: mimeType }));
  return new Request("http://localhost/api/consumos/analizar", { method: "POST", body: form });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/consumos/analizar", () => {
  it("200 con la estimación cuando el análisis es exitoso", async () => {
    analizarImagenMock.mockResolvedValue({
      identificado: true,
      descripcion: "Milanesa con puré",
      calorias: 650,
      desglose: { carbohidratos: 40, proteinas: 30, grasas: 20, otrosNutrientes: 10 },
      confianza: 0.85,
    });

    const { POST } = await import("@/app/api/consumos/analizar/route");
    const response = await POST(requestConImagen(new Uint8Array([1, 2, 3]), "image/jpeg"));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      descripcion: "Milanesa con puré",
      calorias: 650,
      desglose: { carbohidratos: 40, proteinas: 30, grasas: 20, otrosNutrientes: 10 },
      confianza: 0.85,
    });
  });

  it("el body de la respuesta 200 no expone detalles técnicos del modelo (FR-020)", async () => {
    analizarImagenMock.mockResolvedValue({
      identificado: true,
      descripcion: "Ensalada",
      calorias: 200,
      desglose: { carbohidratos: 50, proteinas: 20, grasas: 20, otrosNutrientes: 10 },
      confianza: 0.9,
    });

    const { POST } = await import("@/app/api/consumos/analizar/route");
    const response = await POST(requestConImagen(new Uint8Array([1, 2, 3]), "image/jpeg"));
    const body = await response.json();

    expect(Object.keys(body).sort()).toEqual(["calorias", "confianza", "descripcion", "desglose"]);
    const textoPlano = JSON.stringify(body).toLowerCase();
    expect(textoPlano).not.toContain("gemini");
    expect(textoPlano).not.toContain("generative-ai");
    expect(textoPlano).not.toContain("endpoint");
    expect(textoPlano).not.toContain("googleapis");
  });

  it("400 si falta la imagen", async () => {
    const { POST } = await import("@/app/api/consumos/analizar/route");
    const form = new FormData();
    const response = await POST(new Request("http://localhost/api/consumos/analizar", { method: "POST", body: form }));
    expect(response.status).toBe(400);
  });

  it("400 si el formato no está soportado", async () => {
    const { POST } = await import("@/app/api/consumos/analizar/route");
    const response = await POST(requestConImagen(new Uint8Array([1, 2, 3]), "application/pdf"));
    expect(response.status).toBe(400);
    expect(analizarImagenMock).not.toHaveBeenCalled();
  });

  it("400 si la imagen supera los 10MB (FR-015a)", async () => {
    const { POST } = await import("@/app/api/consumos/analizar/route");
    const bytesGrandes = new Uint8Array(10 * 1024 * 1024 + 1);
    const response = await POST(requestConImagen(bytesGrandes, "image/jpeg"));
    expect(response.status).toBe(400);
    expect(analizarImagenMock).not.toHaveBeenCalled();
  });

  it("422 si el modelo no identifica alimentos", async () => {
    analizarImagenMock.mockResolvedValue({ identificado: false });

    const { POST } = await import("@/app/api/consumos/analizar/route");
    const response = await POST(requestConImagen(new Uint8Array([1, 2, 3]), "image/jpeg"));
    expect(response.status).toBe(422);
  });

  it("500 con mensaje genérico si analizarImagen lanza un error no manejado (FR-021)", async () => {
    analizarImagenMock.mockRejectedValue(new Error("boom interno"));

    const { POST } = await import("@/app/api/consumos/analizar/route");
    const response = await POST(requestConImagen(new Uint8Array([1, 2, 3]), "image/jpeg"));

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBeTruthy();
    expect(JSON.stringify(body).toLowerCase()).not.toContain("boom");
  });

  it("500 con mensaje genérico si analizarImagen lanza RespuestaInvalidaError (JSON malformado del modelo)", async () => {
    const { RespuestaInvalidaError } = await import("@/lib/ai/vision");
    analizarImagenMock.mockRejectedValue(new RespuestaInvalidaError("no es JSON"));

    const { POST } = await import("@/app/api/consumos/analizar/route");
    const response = await POST(requestConImagen(new Uint8Array([1, 2, 3]), "image/jpeg"));

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBeTruthy();
    expect(JSON.stringify(body).toLowerCase()).not.toContain("json");
  });

  it("504 si el análisis supera los 30s (FR-021)", async () => {
    vi.useFakeTimers();
    try {
      analizarImagenMock.mockImplementation(() => new Promise(() => {}));

      const { POST } = await import("@/app/api/consumos/analizar/route");
      const respuestaPromise = POST(requestConImagen(new Uint8Array([1, 2, 3]), "image/jpeg"));

      await vi.advanceTimersByTimeAsync(30_000);
      const response = await respuestaPromise;

      expect(response.status).toBe(504);
    } finally {
      vi.useRealTimers();
    }
  });
});
