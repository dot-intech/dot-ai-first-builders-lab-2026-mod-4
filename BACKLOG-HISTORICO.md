# Backlog histórico — NutraShot

Registro **resumido** de decisiones de proyecto que no viven en ningún
otro documento (ni en un `spec.md`/`research.md` de una feature puntual,
ni en la constitución) y que ayudan a no volver a discutir algo ya
resuelto — incluye intentos descartados, no sólo los que funcionaron. El
detalle narrativo (qué se tocó, paso a paso) queda en el mensaje de cada
commit referenciado; acá sólo la decisión, el motivo si no es obvio, y el
puntero al commit. Ver `AGENTS.md` § Backlog.

---

## 2026-08-29 — Spinner visual durante el procesamiento de la imagen

Sin amend de spec (FR-019/RF-18 ya exigía "indicador gráfico de
procesamiento"; era un refinamiento de la implementación existente, sin
infraestructura de tests para componentes React en el proyecto, por lo
que no aplica TDD aquí — sólo CSS + JSX).

**Commit:** `0abf925`.

---

## 2026-08-29 — Agrandar el campo de la descripción para que se lea completa

Sin amend de spec (no agrega ni modifica ningún FR). Ver T068 en
`specs/001-registro-consumo-foto/tasks.md`. Ancho general del
contenedor (320px, sensación de pantalla "estrecha") queda fuera de
alcance — cubierto por el ítem de Pico.css en `BACKLOG.md`.

**Commits:** `15c97dd` (tasks.md), `6f924ed` (implementación).

---

## 2026-08-29 — FR-019a: mostrar la imagen cargada durante el análisis y la revisión

Amend de spec vía flujo `AGENTS.md` (no spec nueva: refina User Story 2
existente). Ver T064-T067 en `specs/001-registro-consumo-foto/tasks.md`.

**Commits:** `969f8e5` (spec/checklist/tasks), `3ac810d` (implementación).

---

## 2026-08-29 — FR-034b: volver al tablero desde el historial

Amend de spec vía flujo `AGENTS.md`. Ver T063 en
`specs/001-registro-consumo-foto/tasks.md`. Primera vez que se corrió
el flujo de punta a punta — validó que `AGENTS.md` alcanza sin tener
que volver a preguntar el proceso.

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

Spike descartado — ver T059b en
`specs/001-registro-consumo-foto/tasks.md`: sin mejora significativa de
latencia, causa raíz sigue sin identificarse. No volver a probar esta
hipótesis sin evidencia nueva. Ver `BACKLOG.md` § Performance para las
hipótesis pendientes.

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
