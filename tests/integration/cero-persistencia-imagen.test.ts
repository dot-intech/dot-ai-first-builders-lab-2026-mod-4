import { readdirSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const analizarImagenMock = vi.fn();
vi.mock("@/lib/ai/vision", () => ({
  analizarImagen: analizarImagenMock,
}));

function listarArchivosRecursivo(dir: string): string[] {
  const IGNORAR = new Set(["node_modules", ".next", ".git", "coverage"]);
  const resultado: string[] = [];
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    if (IGNORAR.has(entrada.name)) continue;
    const ruta = `${dir}/${entrada.name}`;
    if (entrada.isDirectory()) {
      resultado.push(...listarArchivosRecursivo(ruta));
    } else {
      resultado.push(ruta);
    }
  }
  return resultado;
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("RNF-07 / SC-002 — cero persistencia de imágenes", () => {
  it("no deja archivos nuevos, ni logs con los bytes/base64 de la imagen, tras analizar (éxito o error)", async () => {
    const bytesImagen = new Uint8Array(2048).fill(42);
    const base64Imagen = Buffer.from(bytesImagen).toString("base64");

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const archivosAntes = listarArchivosRecursivo(process.cwd());

    // Caso éxito
    analizarImagenMock.mockResolvedValueOnce({
      identificado: true,
      descripcion: "Ensalada",
      calorias: 200,
      desglose: { carbohidratos: 50, proteinas: 20, grasas: 20, otrosNutrientes: 10 },
      confianza: 0.9,
    });
    const { POST } = await import("@/app/api/consumos/analizar/route");

    const form1 = new FormData();
    form1.set("imagen", new File([bytesImagen as BlobPart], "plato.jpg", { type: "image/jpeg" }));
    await POST(new Request("http://localhost/api/consumos/analizar", { method: "POST", body: form1 }));

    // Caso error del modelo
    analizarImagenMock.mockRejectedValueOnce(new Error("el modelo no respondió"));
    const form2 = new FormData();
    form2.set("imagen", new File([bytesImagen as BlobPart], "plato.jpg", { type: "image/jpeg" }));
    await POST(new Request("http://localhost/api/consumos/analizar", { method: "POST", body: form2 })).catch(() => {});

    const archivosDespues = listarArchivosRecursivo(process.cwd());
    expect(archivosDespues).toEqual(archivosAntes);

    const salidaCapturada = [...logSpy.mock.calls, ...errorSpy.mock.calls, ...warnSpy.mock.calls]
      .flat()
      .map((v) => (typeof v === "string" ? v : JSON.stringify(v)))
      .join("\n");

    expect(salidaCapturada).not.toContain(base64Imagen);
    expect(salidaCapturada).not.toContain(Buffer.from(bytesImagen).toString("hex"));
  });
});
