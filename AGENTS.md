# AGENTS.md

## Propósito
NutraShot es una app web que permite registrar el consumo dietario diario a partir de una foto del plato. La app identifica los alimentos, estima calorías y desglose nutricional, y lleva un historial persistente por usuario.

## Stack
- Next.js 15 (App Router) — fullstack, frontend + backend en un solo proyecto.
- Node.js 20 LTS, npm como gestor de paquetes.
- PostgreSQL, levantada vía Docker Compose en desarrollo (tablas: usuarios, consumos). `npm test` usa una segunda base Postgres separada (también en `docker-compose.yml`), nunca la de desarrollo.
- Vitest para tests.
- Google AI Studio, modelo `gemini-3.1-flash-lite`, para el análisis de imágenes.

## Cómo correr
```bash
npm install
docker compose up -d        # levanta PostgreSQL de dev (5433) y de test (5434)
npm run dev                 # levanta la app en modo desarrollo
npm test                    # corre la suite de tests con Vitest
```
Requiere `GOOGLE_AI_API_KEY` definida en `.env.local` para el análisis de imágenes.

`.env.local` (DB de dev, puerto 5433) y `.env.test` (DB de test, puerto
5434) son archivos separados — copiar `.env.local.example` y
`.env.test.example` respectivamente. Aplicar
`lib/db/migrations/0001_init.sql` contra **ambas** bases antes de
`npm run dev`/`npm test`. `npm test` vacía las tablas de la base que
apunte `.env.test` en cada corrida — nunca debe apuntar a la base de
desarrollo.

## Backlog
Las mejoras identificadas fuera del alcance de una spec cerrada viven en
dos archivos:
- `BACKLOG.md` — ítems abiertos, pendientes de hacer.
- `BACKLOG-HISTORICO.md` — decisiones de proyecto que no viven en ningún
  otro documento (ni en el `spec.md`/`research.md` de una feature
  puntual, ni en la constitución), con fecha, la decisión tomada, y el
  motivo si no es obvio (incluye intentos descartados, no sólo los que
  funcionaron).

Cuando se cierra un ítem, **se saca de `BACKLOG.md` y se agrega como
entrada nueva en `BACKLOG-HISTORICO.md`** (más reciente arriba) — no se
deja tildado `[X]` en `BACKLOG.md`. El objetivo es que `BACKLOG.md`
siempre muestre sólo lo pendiente, y que el historial de decisiones quede
consultable aparte. Un ítem se cierra recién cuando el código está
implementado y sus tests pasan (ver flujo abajo) — nunca antes.

Cada entrada de `BACKLOG-HISTORICO.md` va **resumida**: la decisión y el
motivo (si no es obvio), no el paso a paso — el detalle narrativo (qué
se tocó, en qué orden) ya vive en el mensaje del/los commit(s)
referenciados, no hace falta duplicarlo acá. Cerrar con un puntero a
esos commits.

## Flujo para tomar un ítem del backlog

### 0. Gate de documentos rectores (obligatorio, antes de tocar cualquier spec)
`PRD.md` y la constitución (`.specify/memory/constitution.md`) mandan
sobre cualquier spec. Antes de escribir una línea de spec:
- Si el ítem **contradice o excede** algo que el PRD ya declara (un RF,
  un AC, algo listado en "Fuera de Alcance") o entra en tensión con un
  principio de la constitución: **frenar y confirmar explícitamente con
  el usuario** si corresponde ir en esa dirección, antes de seguir.
- **Nunca decidir en solitario** modificar `PRD.md`, `constitution.md` o
  este mismo `AGENTS.md` como efecto colateral de resolver una tarea —
  son decisiones exclusivas del usuario, siempre a confirmar antes de
  tocarlas.

### 1. ¿Modificar un spec existente, o crear uno nuevo?
- **Corrige/refina un requisito que un spec ya declara** (ej. subir un
  límite, ajustar un umbral, un fix dentro de un flujo ya especificado)
  → modificar ese `spec.md` a mano, con el mismo rigor que aplicaría
  `/speckit-specify` (FRs testeables, sin detalles de implementación).
  **Nunca invocar `/speckit-specify` sobre una carpeta existente** — pisa
  `spec.md` con el template en blanco, sin importar el directorio que se
  le pase.
- **Introduce una capacidad que ningún spec declara hoy** → spec nueva
  (`specs/NNN-nombre/`), pipeline completo desde `/speckit-specify`.

### 2. Pipeline de Spec Kit, según el caso
- **Spec nueva**: `/speckit-specify` → `/speckit-clarify` →
  `/speckit-checklist` → `/speckit-plan` → `/speckit-tasks` →
  `/speckit-analyze`.
- **Modificar un spec existente**: editar `spec.md` a mano →
  `/speckit-clarify` → `/speckit-checklist` → editar a mano
  `research.md`/`data-model.md`/`contracts/`/`quickstart.md`/`plan.md`
  (**nunca correr `/speckit-plan`** sobre un plan existente — regenera
  todo desde cero y borra el razonamiento ya documentado) →
  `/speckit-analyze` → **`/speckit-converge`** para agregar sólo las
  tareas nuevas al final de `tasks.md` (**nunca `/speckit-tasks`**, que
  también regenera `tasks.md` entero y borraría el historial de tareas
  ya cerradas).

### 3. Ítems de investigación/spike
Ítems sin comportamiento observable de usuario (ej. "instrumentar
tiempos para encontrar la causa de la latencia") quedan **fuera** de
este flujo: se resuelven directo y el resultado — funcione o no — se
documenta al cerrarse en `BACKLOG-HISTORICO.md` (ver ejemplo del intento
de `thinkingBudget=0`). Si un spike concluye en un cambio de
comportamiento observable, ese cambio sí entra al flujo de arriba (paso 1).

### 4. Implementación
Siempre TDD (rojo → verde), como en la feature 001.

## Commits
- **Unidad de commit** = el código + sus tests + el estado de `tasks.md`
  para esa tarea (tildada si se completó, o con su status si es un
  commit parcial). Sólo partir una tarea en más de un commit cuando es
  realmente compleja.
- No mezclar concerns no relacionados en un mismo commit (ej. no meter
  un fix de otra tarea en el mismo commit que cierra ésta). La fase de
  diseño (spec/plan/tasks) y la fase de implementación van en commits
  separados, como se hizo en la feature 001.
- **Nunca hacer `git commit` ni `git push` sin confirmación explícita del
  usuario en cada caso**, aunque parezca implícito por la conversación —
  el control de cuándo commitear y pushear es exclusivamente del
  usuario.

## Qué NO hacer
- No persistir imágenes provistas por el usuario en el backend bajo ninguna circunstancia (RNF-07: 0 persistencia de imágenes, por privacidad).
- No implementar login/registro por contraseña: la autenticación es exclusivamente vía magic link enviado por email (RF-03).
- No agregar funcionalidades fuera de alcance (RBAC, multi-tenant, pagos, metas de calorías, export/import, borrado de cuenta) sin confirmar antes con el usuario si corresponde actualizar el PRD (ver gate de documentos rectores arriba).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
