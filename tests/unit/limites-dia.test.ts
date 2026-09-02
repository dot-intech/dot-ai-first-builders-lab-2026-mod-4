import { describe, expect, it } from "vitest";
import { limitesDeHoyLocal } from "@/lib/consumos/limites-dia";

describe("limitesDeHoyLocal", () => {
  it("devuelve el inicio y fin del día local como instantes UTC, 24hs exactas de separación", () => {
    const referencia = new Date("2026-08-26T15:30:00.000Z");
    const { desde, hasta } = limitesDeHoyLocal(referencia);

    expect(new Date(hasta).getTime() - new Date(desde).getTime()).toBe(24 * 60 * 60 * 1000);
    expect(new Date(desde).getHours()).toBe(0);
    expect(new Date(desde).getMinutes()).toBe(0);
  });

  it("el límite inferior es inclusivo y el superior exclusivo respecto al día de la referencia", () => {
    const referencia = new Date("2026-08-26T15:30:00.000Z");
    const { desde, hasta } = limitesDeHoyLocal(referencia);

    expect(new Date(desde).getTime()).toBeLessThanOrEqual(referencia.getTime());
    expect(new Date(hasta).getTime()).toBeGreaterThan(referencia.getTime());
  });
});
