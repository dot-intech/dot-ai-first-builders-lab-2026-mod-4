# Backlog histórico — NutraShot

Registro **resumido** de decisiones de proyecto que no viven en ningún
otro documento (ni en un `spec.md`/`research.md` de una feature puntual,
ni en la constitución) y que ayudan a no volver a discutir algo ya
resuelto — incluye intentos descartados, no sólo los que funcionaron. El
detalle narrativo (qué se tocó, paso a paso) queda en el mensaje de cada
commit referenciado; acá sólo la decisión, el motivo si no es obvio, y el
puntero al commit. Ver `AGENTS.md` § Backlog.

---

## 2026-08-29 — Agrandar el campo de la descripción para que se lea completa

Sin amend de spec (no agrega ni modifica ningún FR — FR-024 ya permite
editar la descripción sin mandatar el tipo de control). `<input>` de una
línea reemplazado por `<textarea>`; primera vuelta (sólo cambiar el tag)
dejó el texto cortado porque el ancho por defecto del navegador es menor
al del contenedor — resuelto con `width: 100%` + `box-sizing:
border-box` en el `textarea` y `display: block` en el `label`. Ancho
general del contenedor (320px, sensación de pantalla "estrecha") queda
fuera de alcance — cubierto por el ítem de Pico.css en `BACKLOG.md`.

**Commits:** `15c97dd` (tasks.md), `6f924ed` (implementación).

---

## 2026-08-29 — FR-019a: mostrar la imagen cargada durante el análisis y la revisión

Amend de spec vía flujo `AGENTS.md` (no spec nueva: refina User Story 2
existente). Decisiones resueltas en checklist: miniatura de tamaño fijo,
sin zoom; se reemplaza (no convive) al recargar imagen con "Cargar otra
imagen"; se muestra también en la carga manual tras error de análisis,
no sólo en la revisión de una estimación exitosa. Implementado con
`URL.createObjectURL` en el cliente, sin persistencia en backend
(FR-031).

**Commits:** `969f8e5` (spec/checklist/tasks), `3ac810d` (implementación).

---

## 2026-08-29 — FR-034b: volver al tablero desde el historial

Amend de spec vía flujo `AGENTS.md`. Decisión: opción de navegación
visible, sin scroll adicional, sólo en Historial (no se generalizó a
otras pantallas). Resuelto con `<Link>` de Next.js, sin lógica de
cliente. Primera vez que se corrió el flujo de punta a punta — validó
que `AGENTS.md` alcanza sin tener que volver a preguntar el proceso.

**Commits:** `5cd0a14` (spec/checklist/tasks), `0535387` (implementación).

---

## 2026-08-28 — Separar la base de datos de tests de la de desarrollo

**Por qué:** `npm test` compartía la DB de dev (mismo `.env.local`,
puerto 5433) y los tests hacen `DELETE FROM` en cada corrida — vació la
sesión real del usuario en un momento real, no fue un riesgo hipotético.

**Decisión:** segundo servicio Postgres en `docker-compose.yml` (puerto
5434, `.env.test` separado) en vez de una DB en memoria o un contenedor
efímero por corrida — se descartó por no ser coherente con la decisión
de `research.md` de no sumar infraestructura de testing adicional a la
ya elegida (Postgres vía Docker Compose, sin ORM).

**Commit:** `2ce5418`.

---

## 2026-08-28 — Descartado: thinkingBudget=0 como fix de performance (FR-022/SC-001)

**Hipótesis:** el modelo `gemini-3.1-flash-lite` podía estar usando un
presupuesto de "thinking" alto por default, explicando el p95 de 31.56s
medido en T059 (vs. umbral de 10s).

**Resultado:** se probó `generationConfig.thinkingConfig.thinkingBudget
= 0` en `lib/ai/vision.ts` — **sin mejora significativa** de latencia.
Se dejó el cambio (config razonable, no hace daño) pero **la causa raíz
sigue sin identificarse** — no volver a probar esta hipótesis sin
evidencia nueva. Ver `BACKLOG.md` § Performance para las hipótesis
pendientes.

**Commits:** `3cb9bbe`, `44cfc8c`.

---

## 2026-08-26 — Seis hallazgos de la tercera vuelta de `/speckit-analyze`, dejados sin resolver a propósito

**Decisión:** tras revisarlos uno por uno con el usuario, se dejaron sin
resolver explícitamente ("no, basta, eso los dejamos así") — no se
perdieron ni se descartaron por omisión. No re-plantearlos como
hallazgos nuevos en una futura vuelta de `/speckit-analyze` sin revisar
antes esta entrada.

- **G1** — falta test de que la descripción (FR-017/US2#3) mencione la
  bebida si está presente.
- **G2** — la agregación del tablero de varios desgloses ya redondeados
  a 100% puede no cerrar en 100% exacto; falta algoritmo de redondeo
  definido y test.
- **A1** — FR-029 no define qué cuenta como "editar manualmente" antes
  de guardar con confianza ≤70%.
- **I1** — `contracts/api.md` describe `GET /api/auth/verify` como 200
  pero en la misma línea dice que redirige con 302 (contradictorio).
- **I2** — diseño de una sola sesión activa por usuario (loguearse en un
  segundo dispositivo invalida la del primero en silencio) sólo
  documentado en `research.md`, nunca como supuesto visible en
  `spec.md`.
- **U1** — T041 llama "p95" a una medición de una sola corrida
  mockeada, no es un p95 real (cosmético, ya cubierto correctamente por
  T059).
