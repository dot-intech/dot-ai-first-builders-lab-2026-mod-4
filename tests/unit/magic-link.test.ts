import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { calcularExpiracionMagicLink, generarTokenMagicLink, hashTokenMagicLink } from "@/lib/auth/magic-link";

describe("generarTokenMagicLink", () => {
  it("genera tokens aleatorios distintos en cada llamada", () => {
    const a = generarTokenMagicLink();
    const b = generarTokenMagicLink();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(32);
  });
});

describe("hashTokenMagicLink", () => {
  it("calcula el hash SHA-256 en hex del token", () => {
    const token = "token-de-prueba";
    const esperado = createHash("sha256").update(token).digest("hex");
    expect(hashTokenMagicLink(token)).toBe(esperado);
  });

  it("es determinístico para el mismo token", () => {
    const token = "otro-token";
    expect(hashTokenMagicLink(token)).toBe(hashTokenMagicLink(token));
  });
});

describe("calcularExpiracionMagicLink", () => {
  it("expira 15 minutos después de la emisión", () => {
    const emitido = new Date("2026-08-26T10:00:00.000Z");
    const expira = calcularExpiracionMagicLink(emitido);
    expect(expira.getTime() - emitido.getTime()).toBe(15 * 60 * 1000);
  });
});
