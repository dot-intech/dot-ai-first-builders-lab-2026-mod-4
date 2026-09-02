import { NextResponse } from "next/server";
import { exigirSesion } from "@/lib/auth/guard";
import { pool } from "@/lib/db/pool";
import { agregarConsumosDia, type ConsumoParaAgregar } from "@/lib/consumos/agregados";

export async function GET(request: Request): Promise<Response> {
  const sesion = await exigirSesion(request);
  if (!sesion.autenticado) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const desde = params.get("desde");
  const hasta = params.get("hasta");
  if (!desde || !hasta || Number.isNaN(Date.parse(desde)) || Number.isNaN(Date.parse(hasta))) {
    return NextResponse.json({ error: "Parámetros desde y hasta requeridos (ISO 8601)" }, { status: 400 });
  }

  const { rows } = await pool.query<{
    calorias: string;
    pct_carbohidratos: number;
    pct_proteinas: number;
    pct_grasas: number;
    pct_otros_nutrientes: number;
  }>(
    `SELECT calorias, pct_carbohidratos, pct_proteinas, pct_grasas, pct_otros_nutrientes
     FROM consumos
     WHERE usuario_id = $1 AND fecha_hora >= $2 AND fecha_hora < $3`,
    [sesion.usuarioId, desde, hasta]
  );

  const consumos: ConsumoParaAgregar[] = rows.map((fila) => ({
    calorias: Number(fila.calorias),
    desglose: {
      carbohidratos: fila.pct_carbohidratos,
      proteinas: fila.pct_proteinas,
      grasas: fila.pct_grasas,
      otrosNutrientes: fila.pct_otros_nutrientes,
    },
  }));

  return NextResponse.json(agregarConsumosDia(consumos));
}
