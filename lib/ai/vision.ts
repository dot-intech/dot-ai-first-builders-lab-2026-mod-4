import { ApiError, GoogleGenAI, ThinkingLevel } from "@google/genai";
import type { GenerateContentConfig, GenerateContentParameters } from "@google/genai";
import type { DesgloseNutricional } from "@/lib/consumos/nutricion";

const MODEL_NAME = "gemini-3.1-flash-lite";
const DESCRIPCION_MAX_LENGTH = 200;
const MAX_INTENTOS_GEMINI = 2;
const ESPERA_REINTENTO_MS = 1000;
const STATUS_TRANSITORIOS = new Set([503, 429]);

/**
 * thinkingLevel es el dial vigente en Gemini 3.x para razonamiento extendido
 * (reemplaza a thinkingBudget, el dial numérico legacy). MINIMAL ya es el
 * default de gemini-3.1-flash-lite según la documentación de Gemini, así que
 * fijarlo acá no cambia el comportamiento del modelo — queda explícito sólo
 * para documentar la intención en el código. thinkingBudget=0 ya se probó
 * por separado como fix de latencia y se descartó sin mejora (T059b, ver
 * BACKLOG-HISTORICO.md); la causa raíz de la latencia de FR-022/SC-001 sigue
 * sin identificarse (ver BACKLOG.md).
 */
const GENERATION_CONFIG: GenerateContentConfig = {
  thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
};

export type AnalisisImagen =
  | {
      identificado: true;
      descripcion: string;
      calorias: number;
      desglose: DesgloseNutricional;
      confianza: number;
    }
  | { identificado: false };

const PROMPT = `Analizá la imagen de un plato de comida y respondé ÚNICAMENTE con un
objeto JSON, sin texto adicional ni bloques de código, con esta forma exacta:

{"identificado": true, "descripcion": "string breve en Español LatAm, incluye la bebida si aplica", "calorias": number, "desglose": {"carbohidratos": number, "proteinas": number, "grasas": number, "otrosNutrientes": number}, "confianza": number}

El campo "desglose" son porcentajes enteros de 0 a 100 que deben sumar exactamente 100.
El campo "confianza" es un número entre 0 y 1 que representa qué tan seguro estás de la estimación.
Toda la respuesta (incluida "descripcion") debe estar en Español LatAm.

Si no podés identificar ningún alimento en la imagen, respondé exactamente:
{"identificado": false}

No inventes valores: si no podés identificar la comida, usá la forma de arriba en vez de estimar.`;

interface RespuestaModeloIdentificada {
  identificado: true;
  descripcion: string;
  calorias: number;
  desglose: DesgloseNutricional;
  confianza: number;
}

interface RespuestaModeloNoIdentificada {
  identificado: false;
}

type RespuestaModelo = RespuestaModeloIdentificada | RespuestaModeloNoIdentificada;

function esFalloTransitorio(error: unknown): boolean {
  return error instanceof ApiError && STATUS_TRANSITORIOS.has(error.status);
}

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generarConReintento(
  genAI: GoogleGenAI,
  params: GenerateContentParameters
): ReturnType<GoogleGenAI["models"]["generateContent"]> {
  for (let intento = 1; intento <= MAX_INTENTOS_GEMINI; intento++) {
    try {
      return await genAI.models.generateContent(params);
    } catch (error) {
      if (intento === MAX_INTENTOS_GEMINI || !esFalloTransitorio(error)) {
        throw error;
      }
      console.warn(
        `[lib/ai/vision] Fallo transitorio de Gemini (intento ${intento}/${MAX_INTENTOS_GEMINI}), reintentando en ${ESPERA_REINTENTO_MS}ms:`,
        error
      );
      await esperar(ESPERA_REINTENTO_MS);
    }
  }
  throw new Error("No se pudo obtener respuesta de Gemini");
}

export async function analizarImagen(buffer: Buffer, mimeType: string): Promise<AnalisisImagen> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_AI_API_KEY no está definida");
  }

  const genAI = new GoogleGenAI({ apiKey });

  let texto: string;
  const tGeminiInicio = performance.now();
  try {
    const result = await generarConReintento(genAI, {
      model: MODEL_NAME,
      contents: [
        { text: PROMPT },
        { inlineData: { data: buffer.toString("base64"), mimeType } },
      ],
      config: GENERATION_CONFIG,
    });
    texto = result.text ?? "";
  } catch (error) {
    console.error("[lib/ai/vision] Error del SDK de Gemini:", error);
    throw new Error("El modelo de visión no respondió correctamente", { cause: error });
  } finally {
    console.log(`[lib/ai/vision] gemini=${(performance.now() - tGeminiInicio).toFixed(0)}ms`);
  }

  const tParseoInicio = performance.now();
  try {
    return parsearRespuesta(texto);
  } catch (error) {
    console.error("[lib/ai/vision] Respuesta del modelo no es JSON válido:", texto, error);
    throw new Error("El modelo de visión devolvió una respuesta inesperada", { cause: error });
  } finally {
    console.log(`[lib/ai/vision] parseo=${(performance.now() - tParseoInicio).toFixed(0)}ms`);
  }
}

function parsearRespuesta(texto: string): AnalisisImagen {
  const json = JSON.parse(limpiarBloqueCodigo(texto)) as RespuestaModelo;

  if (!json.identificado) {
    return { identificado: false };
  }

  return {
    identificado: true,
    descripcion: json.descripcion.slice(0, DESCRIPCION_MAX_LENGTH),
    calorias: json.calorias,
    desglose: json.desglose,
    confianza: json.confianza,
  };
}

function limpiarBloqueCodigo(texto: string): string {
  return texto.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
}
