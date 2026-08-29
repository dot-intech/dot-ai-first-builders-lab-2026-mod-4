"use client";

import { useRef, useState } from "react";
import type { DesgloseNutricional } from "@/lib/consumos/nutricion";

export interface EstimacionAnalisis {
  descripcion: string;
  calorias: number;
  desglose: DesgloseNutricional;
  confianza: number;
}

interface CapturaImagenProps {
  onExito: (estimacion: EstimacionAnalisis, imagenUrl: string) => void;
  onError: (mensaje: string, imagenUrl: string) => void;
}

export default function CapturaImagen({ onExito, onError }: CapturaImagenProps) {
  const [procesando, setProcesando] = useState(false);
  const [imagenUrl, setImagenUrl] = useState<string | null>(null);
  const inputCamaraRef = useRef<HTMLInputElement>(null);
  const inputGaleriaRef = useRef<HTMLInputElement>(null);

  async function analizar(file: File) {
    const urlPreview = URL.createObjectURL(file);
    setImagenUrl(urlPreview);
    setProcesando(true);
    try {
      const form = new FormData();
      form.set("imagen", file);
      const response = await fetch("/api/consumos/analizar", { method: "POST", body: form });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        onError(body?.error ?? "No pudimos analizar la imagen", urlPreview);
        return;
      }

      const estimacion: EstimacionAnalisis = await response.json();
      onExito(estimacion, urlPreview);
    } catch {
      onError("No pudimos analizar la imagen", urlPreview);
    } finally {
      setProcesando(false);
      if (inputCamaraRef.current) inputCamaraRef.current.value = "";
      if (inputGaleriaRef.current) inputGaleriaRef.current.value = "";
    }
  }

  function onCambioArchivo(evento: React.ChangeEvent<HTMLInputElement>) {
    const file = evento.target.files?.[0];
    if (file) void analizar(file);
  }

  if (procesando) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
        <p role="status">Analizando tu foto…</p>
        {imagenUrl && (
          <img
            src={imagenUrl}
            alt="Foto cargada, en análisis"
            style={{ width: 160, height: 160, objectFit: "cover" }}
          />
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <label>
        Tomar foto
        <input
          ref={inputCamaraRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onCambioArchivo}
          style={{ display: "block" }}
        />
      </label>
      <label>
        Elegir de la galería
        <input
          ref={inputGaleriaRef}
          type="file"
          accept="image/*"
          onChange={onCambioArchivo}
          style={{ display: "block" }}
        />
      </label>
    </div>
  );
}
