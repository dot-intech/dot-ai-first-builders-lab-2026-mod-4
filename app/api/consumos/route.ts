import { NextResponse } from "next/server";
import { exigirSesion } from "@/lib/auth/guard";
import { pool } from "@/lib/db/pool";
import { validarConsumo, type DesgloseNutricional } from "@/lib/consumos/nutricion";

interface ConsumoBody {
  descripcion?: unknown;
  calorias?: unknown;
  desglose?: Partial<DesgloseNutricional>;
}

export async function POST(request: Request): Promise<Response> {
  const sesion = await exigirSesion(request);
  if (!sesion.autenticado) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as ConsumoBody | null;
  const descripcion = typeof body?.descripcion === "string" ? body.descripcion : "";
  const calorias = typeof body?.calorias === "number" ? body.calorias : NaN;
  const desglose: DesgloseNutricional = {
    carbohidratos: body?.desglose?.carbohidratos ?? NaN,
    proteinas: body?.desglose?.proteinas ?? NaN,
    grasas: body?.desglose?.grasas ?? NaN,
    otrosNutrientes: body?.desglose?.otrosNutrientes ?? NaN,
  };

  const errores = validarConsumo({ descripcion, calorias, desglose });
  if (errores.length > 0) {
    return NextResponse.json({ error: errores.join(", ") }, { status: 400 });
  }

  try {
    const { rows } = await pool.query<{ id: string; fecha_hora: Date }>(
      `INSERT INTO consumos (usuario_id, descripcion, calorias, pct_carbohidratos, pct_proteinas, pct_grasas, pct_otros_nutrientes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, fecha_hora`,
      [
        sesion.usuarioId,
        descripcion,
        calorias,
        desglose.carbohidratos,
        desglose.proteinas,
        desglose.grasas,
        desglose.otrosNutrientes,
      ]
    );

    return NextResponse.json(
      { id: rows[0].id, fechaHora: new Date(rows[0].fecha_hora).toISOString() },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "No se pudo guardar el consumo" }, { status: 500 });
  }
}

export async function GET(request: Request): Promise<Response> {
  const sesion = await exigirSesion(request);
  if (!sesion.autenticado) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { rows } = await pool.query<{ id: string; fecha_hora: Date; descripcion: string; calorias: string }>(
    `SELECT id, fecha_hora, descripcion, calorias
     FROM consumos
     WHERE usuario_id = $1
     ORDER BY fecha_hora DESC`,
    [sesion.usuarioId]
  );

  return NextResponse.json({
    consumos: rows.map((fila) => ({
      id: fila.id,
      fechaHora: new Date(fila.fecha_hora).toISOString(),
      descripcion: fila.descripcion,
      calorias: Number(fila.calorias),
    })),
  });
}
