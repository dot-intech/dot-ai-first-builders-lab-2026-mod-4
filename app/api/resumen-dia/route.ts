import { NextResponse } from "next/server";
import { exigirSesion } from "@/lib/auth/guard";
import { pool } from "@/lib/db/pool";
import { agregarConsumosDia, type ConsumoParaAgregar } from "@/lib/consumos/agregados";

const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request): Promise<Response> {
  const sesion = await exigirSesion(request);
  if (!sesion.autenticado) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const fecha = new URL(request.url).searchParams.get("fecha");
  if (!fecha || !FECHA_REGEX.test(fecha)) {
    return NextResponse.json({ error: "Parámetro fecha requerido (YYYY-MM-DD)" }, { status: 400 });
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
     WHERE usuario_id = $1 AND fecha_hora::date = $2::date`,
    [sesion.usuarioId, fecha]
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
