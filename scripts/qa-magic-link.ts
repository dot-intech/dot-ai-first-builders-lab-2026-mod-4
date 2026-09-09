import { fileURLToPath } from "url";
import { config as loadEnv } from "dotenv";

// Emite un magic link real contra la base de dev sin pasar por Resend —
// para probar pantallas autenticadas (browser/Playwright) sin depender
// de leer el email. Reusa lib/auth/magic-link.ts, el mismo código que
// usa app/api/auth/magic-link/route.ts y los tests de integración.
async function main() {
  loadEnv({ path: fileURLToPath(new URL("../.env.local", import.meta.url)) });

  const { emitirMagicLink } = await import("@/lib/auth/magic-link");
  const { pool } = await import("@/lib/db/pool");

  const email = process.argv[2] ?? "qa-playwright@nutrashot.local";

  const { token } = await emitirMagicLink(email);
  console.log(`http://localhost:3000/api/auth/verify?token=${token}`);
  await pool.end();
}

main();
