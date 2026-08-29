export interface DesgloseNutricional {
  carbohidratos: number;
  proteinas: number;
  grasas: number;
  otrosNutrientes: number;
}

export interface ConsumoInput {
  descripcion: string;
  calorias: number;
  desglose: DesgloseNutricional;
}

export type ErrorValidacionConsumo =
  | "descripcion_vacia"
  | "descripcion_muy_larga"
  | "calorias_negativas"
  | "desglose_no_entero"
  | "desglose_no_suma_100";

const DESCRIPCION_MAX_LENGTH = 200;

export function validarConsumo(input: ConsumoInput): ErrorValidacionConsumo[] {
  const errores: ErrorValidacionConsumo[] = [];

  if (input.descripcion.trim().length === 0) {
    errores.push("descripcion_vacia");
  } else if (input.descripcion.length > DESCRIPCION_MAX_LENGTH) {
    errores.push("descripcion_muy_larga");
  }

  if (input.calorias < 0) {
    errores.push("calorias_negativas");
  }

  const { carbohidratos, proteinas, grasas, otrosNutrientes } = input.desglose;
  const valores = [carbohidratos, proteinas, grasas, otrosNutrientes];

  if (valores.some((v) => !Number.isInteger(v))) {
    errores.push("desglose_no_entero");
  } else if (carbohidratos + proteinas + grasas + otrosNutrientes !== 100) {
    errores.push("desglose_no_suma_100");
  }

  return errores;
}
