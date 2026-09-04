"use client";

import { useState } from "react";

type Estado = "inicial" | "enviando" | "enviado" | "error";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState<Estado>("inicial");

  async function solicitarLink(evento: React.FormEvent) {
    evento.preventDefault();
    setEstado("enviando");
    try {
      const response = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setEstado(response.ok ? "enviado" : "error");
    } catch {
      setEstado("error");
    }
  }

  return (
    <main className="container" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, padding: 48 }}>
      <h1>NutraShot</h1>

      {estado === "enviado" ? (
        <p>Te enviamos un email con tu link de acceso. Revisá tu bandeja de entrada.</p>
      ) : (
        <form onSubmit={solicitarLink} style={{ display: "flex", flexDirection: "column", gap: 12, width: 280 }}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={estado === "enviando"}
          />
          <button type="submit" disabled={estado === "enviando"}>
            Obtener link de acceso
          </button>
          {estado === "error" && <p role="alert">No pudimos enviar el link. Probá de nuevo.</p>}
        </form>
      )}
    </main>
  );
}
