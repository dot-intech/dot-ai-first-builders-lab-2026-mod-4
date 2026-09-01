import { describe, expect, it } from "vitest";
import { calcularDimensionesDestino, LADO_MAXIMO_PX } from "@/lib/imagen/comprimir";

describe("calcularDimensionesDestino", () => {
  it("no achica una imagen cuyo lado mayor ya está dentro del máximo", () => {
    expect(calcularDimensionesDestino(800, 600)).toEqual({ ancho: 800, alto: 600 });
  });

  it("no achica una imagen cuyo lado mayor es exactamente el máximo", () => {
    expect(calcularDimensionesDestino(LADO_MAXIMO_PX, 900)).toEqual({
      ancho: LADO_MAXIMO_PX,
      alto: 900,
    });
  });

  it("achica proporcionalmente una imagen apaisada que supera el máximo", () => {
    expect(calcularDimensionesDestino(2560, 1440)).toEqual({ ancho: 1280, alto: 720 });
  });

  it("achica proporcionalmente una imagen vertical que supera el máximo", () => {
    expect(calcularDimensionesDestino(1440, 2560)).toEqual({ ancho: 720, alto: 1280 });
  });

  it("respeta un lado máximo distinto al default", () => {
    expect(calcularDimensionesDestino(2000, 1000, 500)).toEqual({ ancho: 500, alto: 250 });
  });
});
