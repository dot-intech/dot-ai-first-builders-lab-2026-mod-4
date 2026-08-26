import { NextResponse } from "next/server";
import { exigirSesion } from "@/lib/auth/guard";
import { pool } from "@/lib/db/pool";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(request: Request, { params }: RouteParams): Promise<Response> {
  const sesion = await exigirSesion(request);
  if (!sesion.autenticado) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const { rowCount } = await pool.query(
      `DELETE FROM consumos WHERE id = $1 AND usuario_id = $2`,
      [id, sesion.usuarioId]
    );

    if (rowCount === 0) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    // Un id con formato inválido se trata igual que "no encontrado" (FR-035):
    // nunca se distingue "no existe" de "formato inválido" o "no es tuyo".
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
}
