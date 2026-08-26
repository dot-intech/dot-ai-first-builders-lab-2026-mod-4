import { redirect } from "next/navigation";
import { obtenerSesionActual } from "@/lib/auth/guard";

export default async function RootPage() {
  const sesion = await obtenerSesionActual();
  redirect(sesion.autenticado ? "/tablero" : "/login");
}
