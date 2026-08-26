"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import CapturaImagen, { type EstimacionAnalisis } from "@/components/CapturaImagen";
import RevisionConsumo from "@/components/RevisionConsumo";

type Paso =
  | { tipo: "captura" }
  | { tipo: "revision"; estimacion: EstimacionAnalisis }
  | { tipo: "manual"; mensajeError: string };

export default function NuevoConsumoPage() {
  const router = useRouter();
  const [paso, setPaso] = useState<Paso>({ tipo: "captura" });

  function irAlTablero() {
    router.push("/tablero");
  }

  return (
    <main style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, padding: 48 }}>
      <h1>Nuevo consumo</h1>

      {paso.tipo === "captura" && (
        <>
          <CapturaImagen
            onExito={(estimacion) => setPaso({ tipo: "revision", estimacion })}
            onError={(mensaje) => setPaso({ tipo: "manual", mensajeError: mensaje })}
          />
          <button type="button" onClick={irAlTablero}>
            Cancelar
          </button>
        </>
      )}

      {paso.tipo === "revision" && (
        <RevisionConsumo
          inicial={paso.estimacion}
          onCancelar={irAlTablero}
          onGuardado={irAlTablero}
          onRecargarImagen={() => setPaso({ tipo: "captura" })}
        />
      )}

      {paso.tipo === "manual" && (
        <>
          <p role="alert">{paso.mensajeError} — completá los datos manualmente.</p>
          <RevisionConsumo inicial={null} onCancelar={irAlTablero} onGuardado={irAlTablero} />
        </>
      )}
    </main>
  );
}
