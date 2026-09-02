import { beforeEach, describe, expect, it, vi } from "vitest";

const generateContentMock = vi.fn();

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(function GoogleGenAI(this: object) {
    Object.assign(this, { models: { generateContent: generateContentMock } });
  }),
  ThinkingLevel: { MINIMAL: "MINIMAL" },
  Type: {
    OBJECT: "OBJECT",
    STRING: "STRING",
    NUMBER: "NUMBER",
    INTEGER: "INTEGER",
    BOOLEAN: "BOOLEAN",
  },
  ApiError: class ApiError extends Error {
    status: number;
    constructor({ message, status }: { message: string; status: number }) {
      super(message);
      this.status = status;
    }
  },
}));

function mockRespuesta(json: unknown) {
  generateContentMock.mockResolvedValue({ text: JSON.stringify(json) });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.GOOGLE_AI_API_KEY = "clave-de-prueba";
});

describe("analizarImagen", () => {
  it("arma {descripcion, calorias, desglose, confianza} a partir de una respuesta exitosa del modelo", async () => {
    mockRespuesta({
      identificado: true,
      descripcion: "Milanesa con puré",
      calorias: 650,
      desglose: { carbohidratos: 40, proteinas: 30, grasas: 20, otrosNutrientes: 10 },
      confianza: 0.85,
    });

    const { analizarImagen } = await import("@/lib/ai/vision");
    const resultado = await analizarImagen(Buffer.from("fake-image"), "image/jpeg");

    expect(resultado).toEqual({
      identificado: true,
      descripcion: "Milanesa con puré",
      calorias: 650,
      desglose: { carbohidratos: 40, proteinas: 30, grasas: 20, otrosNutrientes: 10 },
      confianza: 0.85,
    });
  });

  it("pide structured output con responseMimeType/responseSchema en vez de confiar sólo en el prompt", async () => {
    mockRespuesta({
      identificado: true,
      descripcion: "Ensalada",
      calorias: 200,
      desglose: { carbohidratos: 50, proteinas: 20, grasas: 20, otrosNutrientes: 10 },
      confianza: 0.9,
    });

    const { analizarImagen } = await import("@/lib/ai/vision");
    await analizarImagen(Buffer.from("fake-image"), "image/jpeg");

    const paramsEnviados = generateContentMock.mock.calls[0][0] as {
      config: { responseMimeType?: string; responseSchema?: { type?: string; required?: string[] } };
    };
    expect(paramsEnviados.config.responseMimeType).toBe("application/json");
    expect(paramsEnviados.config.responseSchema?.type).toBe("OBJECT");
    expect(paramsEnviados.config.responseSchema?.required).toContain("identificado");
  });

  it("incluye en el prompt la instrucción de responder en Español LatAm (FR-036)", async () => {
    mockRespuesta({
      identificado: true,
      descripcion: "Ensalada",
      calorias: 200,
      desglose: { carbohidratos: 50, proteinas: 20, grasas: 20, otrosNutrientes: 10 },
      confianza: 0.9,
    });

    const { analizarImagen } = await import("@/lib/ai/vision");
    await analizarImagen(Buffer.from("fake-image"), "image/jpeg");

    const paramsEnviados = generateContentMock.mock.calls[0][0] as { contents: Array<{ text?: string }> };
    const textoPrompt = paramsEnviados.contents.find((p) => typeof p.text === "string")?.text ?? "";
    expect(textoPrompt.toLowerCase()).toContain("español");
  });

  it("trunca la descripción a 200 caracteres (FR-017)", async () => {
    mockRespuesta({
      identificado: true,
      descripcion: "a".repeat(300),
      calorias: 300,
      desglose: { carbohidratos: 25, proteinas: 25, grasas: 25, otrosNutrientes: 25 },
      confianza: 0.6,
    });

    const { analizarImagen } = await import("@/lib/ai/vision");
    const resultado = await analizarImagen(Buffer.from("fake-image"), "image/jpeg");

    expect(resultado.identificado).toBe(true);
    if (resultado.identificado) {
      expect(resultado.descripcion.length).toBe(200);
    }
  });

  it("reporta explícitamente cuando el modelo no identifica alimentos, sin inventar datos (Principio III)", async () => {
    mockRespuesta({ identificado: false });

    const { analizarImagen } = await import("@/lib/ai/vision");
    const resultado = await analizarImagen(Buffer.from("fake-image"), "image/jpeg");

    expect(resultado).toEqual({ identificado: false });
  });

  it("reintenta una vez ante un 503 transitorio de Gemini y devuelve el resultado si el reintento tiene éxito", async () => {
    const { ApiError } = await import("@google/genai");
    generateContentMock
      .mockRejectedValueOnce(new ApiError({ message: "UNAVAILABLE", status: 503 }))
      .mockResolvedValueOnce({
        text: JSON.stringify({
          identificado: true,
          descripcion: "Milanesa con puré",
          calorias: 650,
          desglose: { carbohidratos: 40, proteinas: 30, grasas: 20, otrosNutrientes: 10 },
          confianza: 0.85,
        }),
      });

    vi.useFakeTimers();
    try {
      const { analizarImagen } = await import("@/lib/ai/vision");
      const resultadoPromise = analizarImagen(Buffer.from("fake-image"), "image/jpeg");
      await vi.advanceTimersByTimeAsync(1000);
      const resultado = await resultadoPromise;

      expect(resultado.identificado).toBe(true);
      expect(generateContentMock).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("no reintenta ante un error no transitorio de Gemini (ej. 400)", async () => {
    const { ApiError } = await import("@google/genai");
    generateContentMock.mockRejectedValue(new ApiError({ message: "Bad Request", status: 400 }));

    const { analizarImagen } = await import("@/lib/ai/vision");
    await expect(analizarImagen(Buffer.from("fake-image"), "image/jpeg")).rejects.toThrow();
    expect(generateContentMock).toHaveBeenCalledTimes(1);
  });

  it("lanza RespuestaInvalidaError cuando la respuesta del modelo no es JSON válido", async () => {
    generateContentMock.mockResolvedValue({ text: "esto no es JSON" });

    const { analizarImagen, RespuestaInvalidaError } = await import("@/lib/ai/vision");
    await expect(analizarImagen(Buffer.from("fake-image"), "image/jpeg")).rejects.toBeInstanceOf(
      RespuestaInvalidaError
    );
  });

  it("reintenta como máximo una vez: si el 503 persiste, propaga el error", async () => {
    const { ApiError } = await import("@google/genai");
    generateContentMock.mockRejectedValue(new ApiError({ message: "UNAVAILABLE", status: 503 }));

    vi.useFakeTimers();
    try {
      const { analizarImagen } = await import("@/lib/ai/vision");
      const resultadoPromise = analizarImagen(Buffer.from("fake-image"), "image/jpeg").catch(
        (error: unknown) => error
      );
      await vi.advanceTimersByTimeAsync(1000);
      const error = await resultadoPromise;

      expect(error).toBeInstanceOf(Error);
      expect(generateContentMock).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
