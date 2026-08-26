import { NextResponse } from "next/server";
import { analizarImagen } from "@/lib/ai/vision";

const FORMATOS_SOPORTADOS = new Set(["image/jpeg", "image/png", "image/webp"]);
const TAMANO_MAXIMO_BYTES = 10 * 1024 * 1024;
const TIMEOUT_ANALISIS_MS = 30_000;

class TimeoutAnalisisError extends Error {}

function conTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutAnalisisError()), ms);
    promise.then(
      (valor) => {
        clearTimeout(timer);
        resolve(valor);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

export async function POST(request: Request): Promise<Response> {
  const form = await request.formData().catch(() => null);
  const imagen = form?.get("imagen");

  if (!(imagen instanceof File)) {
    return NextResponse.json({ error: "Falta la imagen" }, { status: 400 });
  }
  if (!FORMATOS_SOPORTADOS.has(imagen.type)) {
    return NextResponse.json({ error: "Formato de imagen no soportado" }, { status: 400 });
  }
  if (imagen.size > TAMANO_MAXIMO_BYTES) {
    return NextResponse.json({ error: "La imagen supera los 10MB" }, { status: 400 });
  }

  const buffer = Buffer.from(await imagen.arrayBuffer());

  let resultado;
  try {
    resultado = await conTimeout(analizarImagen(buffer, imagen.type), TIMEOUT_ANALISIS_MS);
  } catch (error) {
    if (error instanceof TimeoutAnalisisError) {
      return NextResponse.json({ error: "El análisis tardó demasiado" }, { status: 504 });
    }
    throw error;
  }

  if (!resultado.identificado) {
    return NextResponse.json(
      { error: "No pudimos identificar alimentos en la imagen" },
      { status: 422 }
    );
  }

  return NextResponse.json({
    descripcion: resultado.descripcion,
    calorias: resultado.calorias,
    desglose: resultado.desglose,
    confianza: resultado.confianza,
  });
}
