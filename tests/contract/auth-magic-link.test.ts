import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { pool } from "@/lib/db/pool";

const enviarMagicLinkMock = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/email/send-magic-link", () => ({
  enviarMagicLink: enviarMagicLinkMock,
}));

async function limpiar() {
  await pool.query("DELETE FROM consumos");
  await pool.query("DELETE FROM usuarios");
}

beforeEach(async () => {
  vi.clearAllMocks();
  await limpiar();
});

afterAll(async () => {
  await limpiar();
  await pool.end();
});

describe("POST /api/auth/magic-link", () => {
  it("200 con un email válido, y envía el link por email", async () => {
    const { POST } = await import("@/app/api/auth/magic-link/route");
    const request = new Request("http://localhost/api/auth/magic-link", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "usuario@example.com" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ ok: true });
    expect(enviarMagicLinkMock).toHaveBeenCalledTimes(1);
    expect(enviarMagicLinkMock.mock.calls[0][0]).toBe("usuario@example.com");
  });

  it("400 si falta el email", async () => {
    const { POST } = await import("@/app/api/auth/magic-link/route");
    const request = new Request("http://localhost/api/auth/magic-link", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("400 si el email tiene formato inválido", async () => {
    const { POST } = await import("@/app/api/auth/magic-link/route");
    const request = new Request("http://localhost/api/auth/magic-link", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "no-es-un-email" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("200 con redirectTo y sin enviar email cuando el email coincide con QA_BYPASS_EMAIL fuera de producción (FR-003b/AC-03b)", async () => {
    vi.stubEnv("QA_BYPASS_EMAIL", "qa@example.com");
    vi.stubEnv("NODE_ENV", "test");
    const { POST } = await import("@/app/api/auth/magic-link/route");
    const request = new Request("http://localhost/api/auth/magic-link", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "qa@example.com" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(typeof body.redirectTo).toBe("string");
    expect(body.redirectTo).toContain("/api/auth/verify?token=");
    expect(enviarMagicLinkMock).not.toHaveBeenCalled();

    vi.unstubAllEnvs();
  });

  it("200 sin redirectTo y enviando el email normalmente cuando QA_BYPASS_EMAIL coincide pero NODE_ENV=production (FR-003b/AC-03c)", async () => {
    vi.stubEnv("QA_BYPASS_EMAIL", "qa@example.com");
    vi.stubEnv("NODE_ENV", "production");
    const { POST } = await import("@/app/api/auth/magic-link/route");
    const request = new Request("http://localhost/api/auth/magic-link", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "qa@example.com" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ ok: true });
    expect(enviarMagicLinkMock).toHaveBeenCalledTimes(1);

    vi.unstubAllEnvs();
  });
});
