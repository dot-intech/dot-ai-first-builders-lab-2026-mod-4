import { beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.fn().mockResolvedValue({ data: { id: "email-id" }, error: null });

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(function Resend(this: object) {
    Object.assign(this, { emails: { send: sendMock } });
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  process.env.RESEND_API_KEY = "clave-de-prueba";
  process.env.EMAIL_FROM = "NutraShot <no-reply@nutrashot.app>";
});

describe("enviarMagicLink", () => {
  it("envía el email con el link correcto usando EMAIL_FROM", async () => {
    const { enviarMagicLink } = await import("@/lib/email/send-magic-link");

    await enviarMagicLink("usuario@example.com", "https://nutrashot.app/api/auth/verify?token=abc123");

    expect(sendMock).toHaveBeenCalledTimes(1);
    const llamada = sendMock.mock.calls[0][0];
    expect(llamada.from).toBe("NutraShot <no-reply@nutrashot.app>");
    expect(llamada.to).toBe("usuario@example.com");
    expect(llamada.html).toContain("https://nutrashot.app/api/auth/verify?token=abc123");
  });

  it("lanza un error si el SDK de Resend reporta un error (no lo ignora silenciosamente)", async () => {
    sendMock.mockResolvedValueOnce({ data: null, error: { name: "validation_error", message: "API key is invalid" } });

    const { enviarMagicLink } = await import("@/lib/email/send-magic-link");

    await expect(
      enviarMagicLink("usuario@example.com", "https://nutrashot.app/api/auth/verify?token=abc123")
    ).rejects.toThrow(/API key is invalid/);
  });
});
