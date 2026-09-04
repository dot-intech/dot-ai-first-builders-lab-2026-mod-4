import { redirect } from "next/navigation";
import { obtenerSesionActual } from "@/lib/auth/guard";
import { pool } from "@/lib/db/pool";
import AccionesTablero from "@/components/AccionesTablero";
import TableroResumen from "@/components/TableroResumen";

export default async function TableroPage() {
  const sesion = await obtenerSesionActual();
  if (!sesion.autenticado) {
    redirect("/login");
  }

  const { rows } = await pool.query<{ email: string }>("SELECT email FROM usuarios WHERE id = $1", [
    sesion.usuarioId,
  ]);
  const email = rows[0]?.email ?? "";

  return (
    <main className="container" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, padding: 48 }}>
      <h1>¡Hola{email ? `, ${email}` : ""}!</h1>
      <TableroResumen />
      <AccionesTablero />
    </main>
  );
}
