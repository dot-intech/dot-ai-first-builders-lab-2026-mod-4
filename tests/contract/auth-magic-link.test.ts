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
});
