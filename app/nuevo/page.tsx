"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import CapturaImagen, { type EstimacionAnalisis } from "@/components/CapturaImagen";
import RevisionConsumo from "@/components/RevisionConsumo";

type Paso =
  | { tipo: "captura" }
  | { tipo: "revision"; estimacion: EstimacionAnalisis; imagenUrl: string }
  | { tipo: "manual"; mensajeError: string; imagenUrl: string };

export default function NuevoConsumoPage() {
  const router = useRouter();
  const [paso, setPaso] = useState<Paso>({ tipo: "captura" });
  const imagenUrlActualRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (imagenUrlActualRef.current) URL.revokeObjectURL(imagenUrlActualRef.current);
    };
  }, []);

  function reemplazarImagenUrl(nuevaUrl: string | null) {
    if (imagenUrlActualRef.current && imagenUrlActualRef.current !== nuevaUrl) {
      URL.revokeObjectURL(imagenUrlActualRef.current);
    }
    imagenUrlActualRef.current = nuevaUrl;
  }

  function irAlTablero() {
    reemplazarImagenUrl(null);
    router.push("/tablero");
  }

  function volverACaptura() {
    reemplazarImagenUrl(null);
    setPaso({ tipo: "captura" });
  }

  return (
    <main className="container" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, padding: 48 }}>
      <h1>Nuevo consumo</h1>

      {paso.tipo === "captura" && (
        <>
          <CapturaImagen
            onExito={(estimacion, imagenUrl) => {
              reemplazarImagenUrl(imagenUrl);
              setPaso({ tipo: "revision", estimacion, imagenUrl });
            }}
            onError={(mensaje, imagenUrl) => {
              reemplazarImagenUrl(imagenUrl);
              setPaso({ tipo: "manual", mensajeError: mensaje, imagenUrl });
            }}
          />
          <button type="button" onClick={irAlTablero}>
            Cancelar
          </button>
        </>
      )}

      {paso.tipo === "revision" && (
        <RevisionConsumo
          inicial={paso.estimacion}
          imagenUrl={paso.imagenUrl}
          onCancelar={irAlTablero}
          onGuardado={irAlTablero}
          onRecargarImagen={volverACaptura}
        />
      )}

      {paso.tipo === "manual" && (
        <>
          <p role="alert">{paso.mensajeError} — completá los datos manualmente.</p>
          <RevisionConsumo inicial={null} imagenUrl={paso.imagenUrl} onCancelar={irAlTablero} onGuardado={irAlTablero} />
        </>
      )}
    </main>
  );
}
