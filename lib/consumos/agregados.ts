import type { DesgloseNutricional } from "@/lib/consumos/nutricion";

export interface ConsumoParaAgregar {
  calorias: number;
  desglose: DesgloseNutricional;
}

export interface ResumenDia {
  totalCalorias: number;
  desglose: DesgloseNutricional;
}

const CLAVES_DESGLOSE = [
  "carbohidratos",
  "proteinas",
  "grasas",
  "otrosNutrientes",
] as const;

export function agregarConsumosDia(consumos: ConsumoParaAgregar[]): ResumenDia {
  const totalCalorias = consumos.reduce((suma, c) => suma + c.calorias, 0);

  if (totalCalorias === 0) {
    return {
      totalCalorias: 0,
      desglose: { carbohidratos: 0, proteinas: 0, grasas: 0, otrosNutrientes: 0 },
    };
  }

  const pesosExactos = CLAVES_DESGLOSE.map((clave) =>
    consumos.reduce((suma, c) => suma + c.calorias * c.desglose[clave], 0) / totalCalorias
  );

  const desglose = distribuirEnterosQueSuman100(pesosExactos);

  return {
    totalCalorias,
    desglose: {
      carbohidratos: desglose[0],
      proteinas: desglose[1],
      grasas: desglose[2],
      otrosNutrientes: desglose[3],
    },
  };
}

function distribuirEnterosQueSuman100(valores: number[]): number[] {
  const piso = valores.map(Math.floor);
  let restante = 100 - piso.reduce((a, b) => a + b, 0);

  const restos = valores
    .map((valor, indice) => ({ indice, resto: valor - Math.floor(valor) }))
    .sort((a, b) => b.resto - a.resto);

  const resultado = [...piso];
  for (let i = 0; i < restos.length && restante > 0; i++) {
    resultado[restos[i].indice] += 1;
    restante -= 1;
  }

  return resultado;
}
