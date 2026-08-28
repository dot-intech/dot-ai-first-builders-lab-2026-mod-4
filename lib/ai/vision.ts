import { GoogleGenerativeAI } from "@google/generative-ai";
import type { GenerationConfig } from "@google/generative-ai";
import type { DesgloseNutricional } from "@/lib/consumos/nutricion";

const MODEL_NAME = "gemini-3.1-flash-lite";
const DESCRIPCION_MAX_LENGTH = 120;

/**
 * thinkingBudget en 0 desactiva el razonamiento extendido del modelo: sin
 * esto, la API usa un presupuesto por default que resultó ser la causa
 * principal de la latencia observada en T059 (p95 de 31.56s bajo 4G, con
 * imágenes de sólo ~500KB). Si la calidad de las estimaciones se degrada
 * demasiado, subir a un budget chico (p. ej. 512) en vez de volver a 0.
 */
interface GenerationConfigConThinking extends GenerationConfig {
  thinkingConfig?: { thinkingBudget: number };
}

const GENERATION_CONFIG: GenerationConfigConThinking = {
  thinkingConfig: { thinkingBudget: 0 },
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

export async function analizarImagen(buffer: Buffer, mimeType: string): Promise<AnalisisImagen> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_AI_API_KEY no está definida");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME, generationConfig: GENERATION_CONFIG });

  let texto: string;
  try {
    const result = await model.generateContent([
      { text: PROMPT },
      { inlineData: { data: buffer.toString("base64"), mimeType } },
    ]);
    texto = result.response.text();
  } catch (error) {
    console.error("[lib/ai/vision] Error del SDK de Gemini:", error);
    throw new Error("El modelo de visión no respondió correctamente", { cause: error });
  }

  try {
    return parsearRespuesta(texto);
  } catch (error) {
    console.error("[lib/ai/vision] Respuesta del modelo no es JSON válido:", texto, error);
    throw new Error("El modelo de visión devolvió una respuesta inesperada", { cause: error });
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
