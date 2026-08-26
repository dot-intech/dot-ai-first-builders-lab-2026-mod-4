"use client";

import { useEffect, useState } from "react";
import DonaNutricional from "@/components/DonaNutricional";
import type { DesgloseNutricional } from "@/lib/consumos/nutricion";

interface ResumenDia {
  totalCalorias: number;
  desglose: DesgloseNutricional;
}

const CERO: ResumenDia = {
  totalCalorias: 0,
  desglose: { carbohidratos: 0, proteinas: 0, grasas: 0, otrosNutrientes: 0 },
};

function fechaLocalDeHoy(): string {
  const ahora = new Date();
  const anio = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, "0");
  const dia = String(ahora.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

export default function TableroResumen() {
  const [resumen, setResumen] = useState<ResumenDia | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelado = false;

    fetch(`/api/resumen-dia?fecha=${fechaLocalDeHoy()}`)
      .then((res) => {
        if (!res.ok) throw new Error("No se pudo cargar el resumen del día");
        return res.json();
      })
      .then((data: ResumenDia) => {
        if (!cancelado) setResumen(data);
      })
      .catch(() => {
        if (!cancelado) setError(true);
      });

    return () => {
      cancelado = true;
    };
  }, []);

  if (error) {
    return <p role="alert">No pudimos cargar tu resumen del día. Volvé a intentar más tarde.</p>;
  }

  const datos = resumen ?? CERO;

  return <DonaNutricional calorias={datos.totalCalorias} desglose={datos.desglose} />;
}
