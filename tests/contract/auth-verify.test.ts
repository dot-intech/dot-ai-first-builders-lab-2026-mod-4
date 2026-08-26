import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { pool } from "@/lib/db/pool";
import { emitirMagicLink } from "@/lib/auth/magic-link";

async function limpiar() {
  await pool.query("DELETE FROM consumos");
  await pool.query("DELETE FROM usuarios");
}

beforeEach(async () => {
  await limpiar();
});

afterAll(async () => {
  await limpiar();
  await pool.end();
});

describe("GET /api/auth/verify", () => {
  it("200 con un token vigente: redirige al tablero y setea cookie de sesión", async () => {
    const { token } = await emitirMagicLink("verify@example.com");
    const { GET } = await import("@/app/api/auth/verify/route");

    const request = new Request(`http://localhost/api/auth/verify?token=${token}`);
    const response = await GET(request);

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toContain("/tablero");
    expect(response.headers.get("set-cookie")).toContain("nutrashot_session=");
  });

  it("401 con un token inexistente", async () => {
    const { GET } = await import("@/app/api/auth/verify/route");
    const request = new Request("http://localhost/api/auth/verify?token=no-existe");
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("401 con un token ya usado", async () => {
    const { token } = await emitirMagicLink("usado@example.com");
    const { GET } = await import("@/app/api/auth/verify/route");

    const request = new Request(`http://localhost/api/auth/verify?token=${token}`);
    await GET(request);
    const segundaRespuesta = await GET(new Request(`http://localhost/api/auth/verify?token=${token}`));

    expect(segundaRespuesta.status).toBe(401);
  });

  it("401 con un token expirado", async () => {
    const email = "expirado-verify@example.com";
    const { token } = await emitirMagicLink(email);
    await pool.query("UPDATE usuarios SET magic_link_expires_at = now() - interval '1 minute' WHERE email = $1", [email]);

    const { GET } = await import("@/app/api/auth/verify/route");
    const request = new Request(`http://localhost/api/auth/verify?token=${token}`);
    const response = await GET(request);
    expect(response.status).toBe(401);
  });
});
