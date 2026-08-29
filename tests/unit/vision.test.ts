import { beforeEach, describe, expect, it, vi } from "vitest";

const generateContentMock = vi.fn();
const getGenerativeModelMock = vi.fn(() => ({ generateContent: generateContentMock }));

vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(function GoogleGenerativeAI(this: object) {
    Object.assign(this, { getGenerativeModel: getGenerativeModelMock });
  }),
}));

function mockRespuesta(json: unknown) {
  generateContentMock.mockResolvedValue({
    response: { text: () => JSON.stringify(json) },
  });
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

    const partesEnviadas = generateContentMock.mock.calls[0][0] as Array<{ text?: string }>;
    const textoPrompt = partesEnviadas.find((p) => typeof p.text === "string")?.text ?? "";
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
});
