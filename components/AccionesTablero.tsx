"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AccionesTablero() {
  const router = useRouter();
  const [cerrandoSesion, setCerrandoSesion] = useState(false);

  async function cerrarSesion() {
    const confirmado = window.confirm("¿Seguro que querés cerrar sesión?");
    if (!confirmado) return;

    setCerrandoSesion(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setCerrandoSesion(false);
    }
  }

  return (
    <nav style={{ display: "flex", gap: 12 }}>
      <button type="button" onClick={() => router.push("/nuevo")}>
        Nuevo
      </button>
      <button type="button" className="secondary" onClick={() => router.push("/historial")}>
        Historial
      </button>
      <button type="button" className="contrast" onClick={cerrarSesion} disabled={cerrandoSesion}>
        Cerrar sesión
      </button>
    </nav>
  );
}
