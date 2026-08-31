import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { estaSesionInactiva, generarTokenSesion, hashTokenSesion } from "@/lib/auth/session";

describe("generarTokenSesion", () => {
  it("genera tokens aleatorios distintos en cada llamada", () => {
    const a = generarTokenSesion();
    const b = generarTokenSesion();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(32);
  });
});

describe("hashTokenSesion", () => {
  it("calcula el hash SHA-256 en hex del token", () => {
    const token = "token-de-sesion";
    const esperado = createHash("sha256").update(token).digest("hex");
    expect(hashTokenSesion(token)).toBe(esperado);
  });
});

describe("estaSesionInactiva", () => {
  it("no está inactiva justo antes de las 24 horas", () => {
    const ultimaActividad = new Date("2026-08-26T00:00:00.000Z");
    const ahora = new Date(ultimaActividad.getTime() + 24 * 60 * 60 * 1000 - 1);
    expect(estaSesionInactiva(ultimaActividad, ahora)).toBe(false);
  });

  it("está inactiva a partir de las 24 horas exactas", () => {
    const ultimaActividad = new Date("2026-08-26T00:00:00.000Z");
    const ahora = new Date(ultimaActividad.getTime() + 24 * 60 * 60 * 1000);
    expect(estaSesionInactiva(ultimaActividad, ahora)).toBe(true);
  });
});
