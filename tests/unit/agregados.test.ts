import { describe, expect, it } from "vitest";
import { agregarConsumosDia } from "@/lib/consumos/agregados";

describe("agregarConsumosDia", () => {
  it("devuelve todo en cero con una lista vacía", () => {
    const resultado = agregarConsumosDia([]);
    expect(resultado).toEqual({
      totalCalorias: 0,
      desglose: { carbohidratos: 0, proteinas: 0, grasas: 0, otrosNutrientes: 0 },
    });
  });

  it("suma las calorías de todos los consumos", () => {
    const resultado = agregarConsumosDia([
      { calorias: 400, desglose: { carbohidratos: 40, proteinas: 30, grasas: 20, otrosNutrientes: 10 } },
      { calorias: 600, desglose: { carbohidratos: 40, proteinas: 30, grasas: 20, otrosNutrientes: 10 } },
    ]);
    expect(resultado.totalCalorias).toBe(1000);
  });

  it("promedia el desglose ponderado por calorías cuando los porcentajes coinciden", () => {
    const resultado = agregarConsumosDia([
      { calorias: 400, desglose: { carbohidratos: 40, proteinas: 30, grasas: 20, otrosNutrientes: 10 } },
      { calorias: 600, desglose: { carbohidratos: 40, proteinas: 30, grasas: 20, otrosNutrientes: 10 } },
    ]);
    expect(resultado.desglose).toEqual({
      carbohidratos: 40,
      proteinas: 30,
      grasas: 20,
      otrosNutrientes: 10,
    });
  });

  it("el desglose agregado siempre suma exactamente 100, incluso con porcentajes que generan redondeo", () => {
    const resultado = agregarConsumosDia([
      { calorias: 333, desglose: { carbohidratos: 33, proteinas: 33, grasas: 33, otrosNutrientes: 1 } },
      { calorias: 667, desglose: { carbohidratos: 25, proteinas: 25, grasas: 25, otrosNutrientes: 25 } },
    ]);
    const { carbohidratos, proteinas, grasas, otrosNutrientes } = resultado.desglose;
    expect(carbohidratos + proteinas + grasas + otrosNutrientes).toBe(100);
  });
});
