import { createHash, randomBytes } from "node:crypto";
import { pool } from "@/lib/db/pool";

const MAGIC_LINK_TTL_MS = 15 * 60 * 1000;

export function generarTokenMagicLink(): string {
  return randomBytes(32).toString("base64url");
}

export function hashTokenMagicLink(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function calcularExpiracionMagicLink(emitidoEn: Date): Date {
  return new Date(emitidoEn.getTime() + MAGIC_LINK_TTL_MS);
}

export interface MagicLinkEmitido {
  token: string;
  usuarioId: string;
}

export type ResultadoValidacionMagicLink =
  | { valido: true; usuarioId: string }
  | { valido: false };

/** Crea el usuario si no existía (FR-003a) y sobreescribe cualquier link previo no usado (FR-004a). */
export async function emitirMagicLink(email: string): Promise<MagicLinkEmitido> {
  const token = generarTokenMagicLink();
  const tokenHash = hashTokenMagicLink(token);
  const expiraEn = calcularExpiracionMagicLink(new Date());

  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO usuarios (email, magic_link_token_hash, magic_link_expires_at, magic_link_used_at)
     VALUES ($1, $2, $3, NULL)
     ON CONFLICT (email) DO UPDATE
       SET magic_link_token_hash = EXCLUDED.magic_link_token_hash,
           magic_link_expires_at = EXCLUDED.magic_link_expires_at,
           magic_link_used_at = NULL
     RETURNING id`,
    [email, tokenHash, expiraEn]
  );

  return { token, usuarioId: rows[0].id };
}

/** Valida un magic link (FR-004, FR-005) y crea la sesión (delegado al caller vía lib/auth/session.ts). */
export async function validarMagicLink(token: string): Promise<ResultadoValidacionMagicLink> {
  const tokenHash = hashTokenMagicLink(token);

  const { rows } = await pool.query<{
    id: string;
    magic_link_expires_at: Date;
    magic_link_used_at: Date | null;
  }>(
    `SELECT id, magic_link_expires_at, magic_link_used_at
     FROM usuarios
     WHERE magic_link_token_hash = $1`,
    [tokenHash]
  );

  const usuario = rows[0];
  if (!usuario) {
    return { valido: false };
  }
  if (usuario.magic_link_used_at !== null) {
    return { valido: false };
  }
  if (new Date(usuario.magic_link_expires_at).getTime() <= Date.now()) {
    return { valido: false };
  }

  await pool.query(`UPDATE usuarios SET magic_link_used_at = now() WHERE id = $1`, [usuario.id]);

  return { valido: true, usuarioId: usuario.id };
}

/** Limpia el magic link vigente de un usuario (usado tras validarlo o al invalidarlo explícitamente). */
export async function invalidarMagicLink(usuarioId: string): Promise<void> {
  await pool.query(
    `UPDATE usuarios
     SET magic_link_token_hash = NULL, magic_link_expires_at = NULL, magic_link_used_at = NULL
     WHERE id = $1`,
    [usuarioId]
  );
}
