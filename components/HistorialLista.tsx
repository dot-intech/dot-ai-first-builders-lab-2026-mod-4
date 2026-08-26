"use client";

import { useState } from "react";

export interface ConsumoHistorial {
  id: string;
  fechaHora: string;
  descripcion: string;
  calorias: number;
}

interface HistorialListaProps {
  consumosIniciales: ConsumoHistorial[];
}

function grupoDeFecha(fecha: Date, ahora: Date): string {
  const inicioSemana = new Date(ahora);
  inicioSemana.setDate(ahora.getDate() - 7);

  if (fecha >= inicioSemana) return "Esta semana";
  if (fecha.getFullYear() === ahora.getFullYear() && fecha.getMonth() === ahora.getMonth()) return "Este mes";
  if (fecha.getFullYear() === ahora.getFullYear()) {
    const nombreMes = fecha.toLocaleDateString("es-AR", { month: "long" });
    return nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1);
  }
  return String(fecha.getFullYear());
}

function agrupar(consumos: ConsumoHistorial[]): { grupo: string; items: ConsumoHistorial[] }[] {
  const ahora = new Date();
  const grupos: { grupo: string; items: ConsumoHistorial[] }[] = [];

  for (const consumo of consumos) {
    const clave = grupoDeFecha(new Date(consumo.fechaHora), ahora);
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.grupo === clave) {
      ultimo.items.push(consumo);
    } else {
      grupos.push({ grupo: clave, items: [consumo] });
    }
  }

  return grupos;
}

export default function HistorialLista({ consumosIniciales }: HistorialListaProps) {
  const [consumos, setConsumos] = useState(consumosIniciales);

  async function eliminar(id: string) {
    const confirmado = window.confirm(
      "¿Seguro que querés eliminar este consumo? Esta acción no se puede deshacer."
    );
    if (!confirmado) return;

    const response = await fetch(`/api/consumos/${id}`, { method: "DELETE" });
    if (response.ok) {
      setConsumos((actuales) => actuales.filter((c) => c.id !== id));
    }
  }

  if (consumos.length === 0) {
    return <p>Todavía no registraste consumos.</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%", maxWidth: 480 }}>
      {agrupar(consumos).map(({ grupo, items }) => (
        <section key={`${grupo}-${items[0].id}`}>
          <h2>{grupo}</h2>
          <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {items.map((consumo) => (
              <li
                key={consumo.id}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}
              >
                <span>
                  {new Date(consumo.fechaHora).toLocaleString("es-AR")} — {consumo.descripcion} (
                  {consumo.calorias} kcal)
                </span>
                <button type="button" onClick={() => eliminar(consumo.id)}>
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
