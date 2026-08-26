import { Resend } from "resend";

export async function enviarMagicLink(email: string, link: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY no está definida");
  }
  if (!from) {
    throw new Error("EMAIL_FROM no está definida");
  }

  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from,
    to: email,
    subject: "Tu link de acceso a NutraShot",
    html: `
      <p>Usá el siguiente link para entrar a NutraShot (válido por 15 minutos):</p>
      <p><a href="${link}">${link}</a></p>
      <p>Si no pediste este link, podés ignorar este email.</p>
    `,
  });

  if (error) {
    throw new Error(`No se pudo enviar el magic link: ${error.message}`);
  }
}
