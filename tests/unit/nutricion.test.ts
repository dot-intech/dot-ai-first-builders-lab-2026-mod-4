import { describe, expect, it } from "vitest";
import { validarConsumo } from "@/lib/consumos/nutricion";

const desgloseValido = {
  carbohidratos: 40,
  proteinas: 30,
  grasas: 20,
  otrosNutrientes: 10,
};

describe("validarConsumo", () => {
  it("acepta un desglose que suma exactamente 100", () => {
    const errores = validarConsumo({
      descripcion: "Milanesa con puré",
      calorias: 650,
      desglose: desgloseValido,
    });
    expect(errores).toEqual([]);
  });

  it("rechaza un desglose que no suma 100", () => {
    const errores = validarConsumo({
      descripcion: "Milanesa con puré",
      calorias: 650,
      desglose: { carbohidratos: 40, proteinas: 30, grasas: 20, otrosNutrientes: 5 },
    });
    expect(errores).toContain("desglose_no_suma_100");
  });

  it("rechaza calorías negativas", () => {
    const errores = validarConsumo({
      descripcion: "Milanesa con puré",
      calorias: -1,
      desglose: desgloseValido,
    });
    expect(errores).toContain("calorias_negativas");
  });

  it("acepta calorías igual a cero", () => {
    const errores = validarConsumo({
      descripcion: "Agua",
      calorias: 0,
      desglose: desgloseValido,
    });
    expect(errores).not.toContain("calorias_negativas");
  });

  it("rechaza descripción vacía", () => {
    const errores = validarConsumo({
      descripcion: "",
      calorias: 100,
      desglose: desgloseValido,
    });
    expect(errores).toContain("descripcion_vacia");
  });

  it("rechaza descripción de más de 120 caracteres", () => {
    const errores = validarConsumo({
      descripcion: "a".repeat(121),
      calorias: 100,
      desglose: desgloseValido,
    });
    expect(errores).toContain("descripcion_muy_larga");
  });

  it("acepta descripción de exactamente 120 caracteres", () => {
    const errores = validarConsumo({
      descripcion: "a".repeat(120),
      calorias: 100,
      desglose: desgloseValido,
    });
    expect(errores).not.toContain("descripcion_muy_larga");
  });

  it("rechaza un desglose con porcentajes no enteros (contracts/api.md)", () => {
    const errores = validarConsumo({
      descripcion: "Milanesa con puré",
      calorias: 650,
      desglose: { carbohidratos: 40.5, proteinas: 29.5, grasas: 20, otrosNutrientes: 10 },
    });
    expect(errores).toContain("desglose_no_entero");
  });
});
