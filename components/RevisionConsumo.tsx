"use client";

import { useState } from "react";
import { ETIQUETAS_DESGLOSE, validarConsumo, type DesgloseNutricional } from "@/lib/consumos/nutricion";
import DonaNutricional from "@/components/DonaNutricional";

export interface EstimacionInicial {
  descripcion: string;
  calorias: number;
  desglose: DesgloseNutricional;
  confianza: number;
}

interface RevisionConsumoProps {
  inicial: EstimacionInicial | null;
  imagenUrl?: string | null;
  onCancelar: () => void;
  onGuardado: () => void;
  onRecargarImagen?: () => void;
}

const DESGLOSE_VACIO: DesgloseNutricional = {
  carbohidratos: 0,
  proteinas: 0,
  grasas: 0,
  otrosNutrientes: 0,
};

const UMBRAL_BAJA_CONFIANZA = 0.7;

export default function RevisionConsumo({ inicial, imagenUrl, onCancelar, onGuardado, onRecargarImagen }: RevisionConsumoProps) {
  const [descripcion, setDescripcion] = useState(inicial?.descripcion ?? "");
  const [calorias, setCalorias] = useState(inicial?.calorias ?? 0);
  const [desglose, setDesglose] = useState<DesgloseNutricional>(inicial?.desglose ?? DESGLOSE_VACIO);
  const [editadoManualmente, setEditadoManualmente] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bajaConfianza = inicial !== null && inicial.confianza <= UMBRAL_BAJA_CONFIANZA;
  const erroresValidacion = validarConsumo({ descripcion, calorias, desglose });
  const guardadoBloqueadoPorConfianza = bajaConfianza && !editadoManualmente;
  const puedeGuardar = erroresValidacion.length === 0 && !guardadoBloqueadoPorConfianza && !guardando;

  function actualizarDesglose(clave: keyof DesgloseNutricional, valor: number) {
    setDesglose((anterior) => ({ ...anterior, [clave]: valor }));
    setEditadoManualmente(true);
  }

  async function guardar() {
    setError(null);
    setGuardando(true);
    try {
      const response = await fetch("/api/consumos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ descripcion, calorias, desglose }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error ?? "No pudimos guardar el consumo. Los datos siguen acá — probá de nuevo.");
        return;
      }

      onGuardado();
    } catch {
      setError("No pudimos guardar el consumo. Los datos siguen acá — probá de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <article style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 640 }}>
      <p>
        <mark>⚠️ Esta estimación puede ser inexacta — revisala antes de guardar.</mark>
      </p>

      {imagenUrl && (
        <img
          src={imagenUrl}
          alt="Foto del consumo cargada"
          style={{
            display: "block",
            width: "100%",
            maxWidth: 320,
            margin: "0 auto",
            aspectRatio: "1 / 1",
            objectFit: "cover",
            borderRadius: "var(--pico-border-radius)",
            border: "var(--pico-border-width) solid var(--pico-muted-border-color)",
            boxShadow: "var(--pico-card-box-shadow)",
          }}
        />
      )}

      {bajaConfianza && (
        <div role="alert">
          <p>Confianza baja en esta estimación. Editá la descripción y las calorías para poder guardar.</p>
          {onRecargarImagen && (
            <button type="button" onClick={onRecargarImagen}>
              Cargar otra imagen
            </button>
          )}
        </div>
      )}

      <label style={{ display: "block" }}>
        Descripción
        <textarea
          value={descripcion}
          maxLength={200}
          rows={4}
          style={{ display: "block", width: "100%", boxSizing: "border-box" }}
          onChange={(e) => {
            setDescripcion(e.target.value);
            setEditadoManualmente(true);
          }}
        />
      </label>

      <label>
        Calorías
        <input
          type="number"
          min={0}
          value={calorias}
          onChange={(e) => {
            setCalorias(Number(e.target.value));
            setEditadoManualmente(true);
          }}
        />
      </label>

      <fieldset>
        <legend>Desglose nutricional</legend>
        <div className="desglose-grid">
          {(Object.keys(desglose) as (keyof DesgloseNutricional)[]).map((clave) => (
            <label key={clave}>
              <span className="desglose-grid-etiqueta">{ETIQUETAS_DESGLOSE[clave]} (%)</span>
              <input
                type="number"
                min={0}
                max={100}
                value={desglose[clave]}
                onChange={(e) => actualizarDesglose(clave, Number(e.target.value))}
              />
            </label>
          ))}
        </div>
      </fieldset>

      <DonaNutricional calorias={calorias} desglose={desglose} />

      {error && <p role="alert">{error}</p>}

      <div role="group">
        <button type="button" onClick={guardar} disabled={!puedeGuardar}>
          Guardar
        </button>
        <button type="button" className="secondary" onClick={onCancelar}>
          Cancelar
        </button>
      </div>
    </article>
  );
}
