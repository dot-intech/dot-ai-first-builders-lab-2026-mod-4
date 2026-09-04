"use client";

import { useEffect, useState } from "react";
import DonaNutricional from "@/components/DonaNutricional";
import { limitesDeHoyLocal } from "@/lib/consumos/limites-dia";
import type { DesgloseNutricional } from "@/lib/consumos/nutricion";

interface ResumenDia {
  totalCalorias: number;
  desglose: DesgloseNutricional;
}

const CERO: ResumenDia = {
  totalCalorias: 0,
  desglose: { carbohidratos: 0, proteinas: 0, grasas: 0, otrosNutrientes: 0 },
};

export default function TableroResumen() {
  const [resumen, setResumen] = useState<ResumenDia | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelado = false;

    function buscarResumen() {
      const { desde, hasta } = limitesDeHoyLocal();
      fetch(`/api/resumen-dia?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`)
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
    }

    buscarResumen();

    // Al restaurarse desde el bfcache del navegador (event.persisted), el
    // componente no se remonta y este efecto no se re-ejecuta solo — hay que
    // volver a pedir el resumen a mano para no mostrar datos desactualizados
    // (FR-012, commit `789a4d7`).
    function alRestaurarDesdeBfcache(evento: PageTransitionEvent) {
      if (evento.persisted) buscarResumen();
    }
    window.addEventListener("pageshow", alRestaurarDesdeBfcache);

    return () => {
      cancelado = true;
      window.removeEventListener("pageshow", alRestaurarDesdeBfcache);
    };
  }, []);

  if (error) {
    return <p role="alert">No pudimos cargar tu resumen del día. Volvé a intentar más tarde.</p>;
  }

  const datos = resumen ?? CERO;

  return (
    <article>
      <DonaNutricional calorias={datos.totalCalorias} desglose={datos.desglose} />
    </article>
  );
}
