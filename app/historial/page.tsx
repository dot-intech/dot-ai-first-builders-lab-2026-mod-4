import Link from "next/link";
import { redirect } from "next/navigation";
import { obtenerSesionActual } from "@/lib/auth/guard";
import { pool } from "@/lib/db/pool";
import HistorialLista, { type ConsumoHistorial } from "@/components/HistorialLista";

export default async function HistorialPage() {
  const sesion = await obtenerSesionActual();
  if (!sesion.autenticado) {
    redirect("/login");
  }

  const { rows } = await pool.query<{ id: string; fecha_hora: Date; descripcion: string; calorias: string }>(
    `SELECT id, fecha_hora, descripcion, calorias
     FROM consumos
     WHERE usuario_id = $1
     ORDER BY fecha_hora DESC`,
    [sesion.usuarioId]
  );

  const consumosIniciales: ConsumoHistorial[] = rows.map((fila) => ({
    id: fila.id,
    fechaHora: new Date(fila.fecha_hora).toISOString(),
    descripcion: fila.descripcion,
    calorias: Number(fila.calorias),
  }));

  return (
    <main className="container" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, padding: 48 }}>
      <Link href="/tablero">← Volver al tablero</Link>
      <h1>Historial</h1>
      <HistorialLista consumosIniciales={consumosIniciales} />
    </main>
  );
}
