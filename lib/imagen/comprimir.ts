export const LADO_MAXIMO_PX = 1280;
export const CALIDAD_JPEG = 0.85;

export function calcularDimensionesDestino(
  anchoOriginal: number,
  altoOriginal: number,
  ladoMaximo: number = LADO_MAXIMO_PX
): { ancho: number; alto: number } {
  const ladoMayor = Math.max(anchoOriginal, altoOriginal);
  if (ladoMayor <= ladoMaximo) {
    return { ancho: anchoOriginal, alto: altoOriginal };
  }
  const escala = ladoMaximo / ladoMayor;
  return {
    ancho: Math.round(anchoOriginal * escala),
    alto: Math.round(altoOriginal * escala),
  };
}

/**
 * Redimensiona y recomprime la imagen en el navegador antes de subirla, para
 * reducir el tiempo de subida (RF-022/SC-001). Si algo falla (navegador sin
 * soporte, canvas nulo), devuelve el archivo original sin tocar — es una
 * optimización defensiva, no un requisito funcional.
 */
export async function comprimirImagen(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const { ancho, alto } = calcularDimensionesDestino(bitmap.width, bitmap.height);

    const canvas = document.createElement("canvas");
    canvas.width = ancho;
    canvas.height = alto;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, ancho, alto);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", CALIDAD_JPEG)
    );
    if (!blob) return file;

    return new File([blob], file.name, { type: "image/jpeg" });
  } catch {
    return file;
  }
}
