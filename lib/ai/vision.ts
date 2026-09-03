import { ApiError, GoogleGenAI, MediaResolution, ThinkingLevel, Type } from "@google/genai";
import type { GenerateContentConfig, GenerateContentParameters, Schema } from "@google/genai";
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
 * por separado como fix de latencia y se descartó sin mejora (commits
 * `3cb9bbe`/`44cfc8c`); la latencia de FR-022/SC-001 está confirmada como
 * la espera de la respuesta de Gemini (ver BACKLOG.md § Performance), no
 * hay margen de optimización adicional en el código de la app para esto.
 */
/**
 * responseSchema restringe el sampling de tokens del modelo para que sólo
 * pueda generar JSON que cumpla esta forma, en vez de depender de que
 * obedezca la instrucción de formato del PROMPT (que hoy se mitiga a medias
 * con limpiarBloqueCodigo si el modelo igual lo envuelve en markdown). No es
 * 100% infalible (puede truncarse por límite de tokens), pero elimina la
 * clase de error más probable de JSON malformado (ver BACKLOG.md).
 *
 * anyOf con dos ramas (en vez de un único `required` a nivel raíz) porque el
 * modelo puede responder de dos formas mutuamente excluyentes: identificado
 * con todos los datos, o `{"identificado": false}` sin el resto — un solo
 * `required: ["identificado"]` dejaba a descripcion/calorias/desglose/
 * confianza opcionales incluso cuando identificado=true, y el modelo los
 * omitía en la práctica (ver BACKLOG.md).
 */
const RESPUESTA_IDENTIFICADA_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    identificado: { type: Type.BOOLEAN },
    descripcion: { type: Type.STRING },
    calorias: { type: Type.NUMBER, minimum: 0 },
    desglose: {
      type: Type.OBJECT,
      properties: {
        carbohidratos: { type: Type.INTEGER, minimum: 0, maximum: 100 },
        proteinas: { type: Type.INTEGER, minimum: 0, maximum: 100 },
        grasas: { type: Type.INTEGER, minimum: 0, maximum: 100 },
        otrosNutrientes: { type: Type.INTEGER, minimum: 0, maximum: 100 },
      },
      required: ["carbohidratos", "proteinas", "grasas", "otrosNutrientes"],
    },
    confianza: { type: Type.NUMBER, minimum: 0, maximum: 1 },
  },
  required: ["identificado", "descripcion", "calorias", "desglose", "confianza"],
};

const RESPUESTA_NO_IDENTIFICADA_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    identificado: { type: Type.BOOLEAN },
  },
  required: ["identificado"],
};

const RESPUESTA_SCHEMA: Schema = {
  anyOf: [RESPUESTA_IDENTIFICADA_SCHEMA, RESPUESTA_NO_IDENTIFICADA_SCHEMA],
};

/**
 * MEDIA_RESOLUTION_LOW baja los tokens de imagen que procesa el modelo
 * (~4x menos, medido en el spike de BACKLOG.md: ~1080 → ~260 tokens sobre
 * fotos reales de comida) sin costo de latencia medido ni degradación
 * visible en la descripción devuelta. Se adopta para no consumir más cuota
 * del free tier (TPM) de la que la app necesita, no porque baje el p95.
 */
const GENERATION_CONFIG: GenerateContentConfig = {
  thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
  responseMimeType: "application/json",
  responseSchema: RESPUESTA_SCHEMA,
  mediaResolution: MediaResolution.MEDIA_RESOLUTION_LOW,
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

export class RespuestaInvalidaError extends Error {}

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

const MAX_INTENTOS_PARSEO = 2;

async function llamarYParsear(
  genAI: GoogleGenAI,
  params: GenerateContentParameters
): Promise<AnalisisImagen> {
  let texto: string;
  const tGeminiInicio = performance.now();
  try {
    const result = await generarConReintento(genAI, params);
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
    throw new RespuestaInvalidaError("El modelo de visión devolvió una respuesta inesperada", {
      cause: error,
    });
  } finally {
    console.log(`[lib/ai/vision] parseo=${(performance.now() - tParseoInicio).toFixed(0)}ms`);
  }
}

export async function analizarImagen(buffer: Buffer, mimeType: string): Promise<AnalisisImagen> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_AI_API_KEY no está definida");
  }

  const genAI = new GoogleGenAI({ apiKey });
  const params: GenerateContentParameters = {
    model: MODEL_NAME,
    contents: [
      { text: PROMPT },
      { inlineData: { data: buffer.toString("base64"), mimeType } },
    ],
    config: GENERATION_CONFIG,
  };

  for (let intento = 1; intento <= MAX_INTENTOS_PARSEO; intento++) {
    try {
      return await llamarYParsear(genAI, params);
    } catch (error) {
      if (intento === MAX_INTENTOS_PARSEO || !(error instanceof RespuestaInvalidaError)) {
        throw error;
      }
      console.warn(
        `[lib/ai/vision] JSON inválido pese al schema (intento ${intento}/${MAX_INTENTOS_PARSEO}), reintentando de inmediato`
      );
    }
  }
  throw new Error("No se pudo obtener una respuesta parseable de Gemini");
}

function parsearRespuesta(texto: string): AnalisisImagen {
  const json = JSON.parse(limpiarBloqueCodigo(texto)) as RespuestaModelo;

  if (!json.identificado) {
    return { identificado: false };
  }

  if (
    typeof json.descripcion !== "string" ||
    typeof json.calorias !== "number" ||
    typeof json.confianza !== "number" ||
    json.desglose == null
  ) {
    throw new Error("Respuesta identificada sin todos los campos obligatorios pese al schema");
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
