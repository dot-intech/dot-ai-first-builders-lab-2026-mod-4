import { createHash, randomBytes } from "node:crypto";
import { pool } from "@/lib/db/pool";

const INACTIVIDAD_MAX_MS = 24 * 60 * 60 * 1000;

export function generarTokenSesion(): string {
  return randomBytes(32).toString("base64url");
}

export function hashTokenSesion(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function estaSesionInactiva(ultimaActividad: Date, ahora: Date): boolean {
  return ahora.getTime() - ultimaActividad.getTime() >= INACTIVIDAD_MAX_MS;
}

export interface SesionCreada {
  token: string;
}

export type ResultadoValidacionSesion =
  | { valido: true; usuarioId: string }
  | { valido: false };

export async function crearSesion(usuarioId: string): Promise<SesionCreada> {
  const token = generarTokenSesion();
  const tokenHash = hashTokenSesion(token);

  await pool.query(
    `UPDATE usuarios
     SET session_token_hash = $1, session_last_activity_at = now()
     WHERE id = $2`,
    [tokenHash, usuarioId]
  );

  return { token };
}

/** Valida la sesión y, si sigue activa, desliza la ventana de inactividad (FR-006). */
export async function validarSesion(token: string): Promise<ResultadoValidacionSesion> {
  const tokenHash = hashTokenSesion(token);

  const { rows } = await pool.query<{ id: string; session_last_activity_at: Date }>(
    `SELECT id, session_last_activity_at FROM usuarios WHERE session_token_hash = $1`,
    [tokenHash]
  );

  const usuario = rows[0];
  if (!usuario || !usuario.session_last_activity_at) {
    return { valido: false };
  }

  if (estaSesionInactiva(new Date(usuario.session_last_activity_at), new Date())) {
    return { valido: false };
  }

  await pool.query(`UPDATE usuarios SET session_last_activity_at = now() WHERE id = $1`, [usuario.id]);

  return { valido: true, usuarioId: usuario.id };
}

export async function cerrarSesion(usuarioId: string): Promise<void> {
  await pool.query(
    `UPDATE usuarios SET session_token_hash = NULL, session_last_activity_at = NULL WHERE id = $1`,
    [usuarioId]
  );
}
