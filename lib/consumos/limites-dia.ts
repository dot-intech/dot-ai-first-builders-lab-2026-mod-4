export interface LimitesDia {
  desde: string;
  hasta: string;
}

/**
 * Calcula el inicio y fin del día "de hoy" en la zona horaria local del
 * entorno en que corre (dispositivo del usuario en el cliente), como
 * instantes UTC — para que el servidor pueda filtrar por rango sin tener
 * que reinterpretar ninguna fecha en su propia zona horaria.
 */
export function limitesDeHoyLocal(referencia: Date = new Date()): LimitesDia {
  const inicio = new Date(referencia.getFullYear(), referencia.getMonth(), referencia.getDate());
  const fin = new Date(inicio);
  fin.setDate(fin.getDate() + 1);
  return { desde: inicio.toISOString(), hasta: fin.toISOString() };
}
