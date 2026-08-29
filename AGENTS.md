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
`BACKLOG.md` (ítems abiertos) y `BACKLOG-HISTORICO.md` (decisiones de
proyecto ya cerradas, resumidas). El flujo completo para tomar y cerrar
un ítem — gate de PRD/constitución, spec nuevo vs. modificar uno
existente, qué comandos de Spec Kit correr, ítems de spike — vive en la
skill `flujo-backlog`: invocarla al empezar a trabajar un ítem del
backlog.

## Principios de implementación
Aplican a cualquier cambio de código (fix, feature, ítem de backlog), no
sólo a los que pasan por el flujo de arriba.

- **Cambio mínimo indispensable.** Al resolver un fix o agregar una
  feature sobre código ya existente, tocar sólo lo estrictamente
  necesario para completar la tarea — no aprovechar el cambio para
  refactors, limpieza o ajustes no pedidos, aunque se los note al pasar.
  Si algo fuera de alcance amerita cambiarse, es un ítem de `BACKLOG.md`
  aparte, no parte de este commit.
- **No duplicar lógica que ya existe.** Si código nuevo necesita algo que
  ya está resuelto en otro lugar (misma lógica, no sólo código
  parecido), extraerlo a una función/componente reusable e invocarlo
  desde ambos puntos en vez de copiar/pegar una vez más — además de
  reducir superficie de bugs, el test queda encapsulado en un único
  lugar en vez de repetirse por cada copia. **Esto no es licencia para
  refactorizar duplicación preexistente no relacionada con la tarea
  actual** — eso choca con el principio anterior; si amerita hacerse, es
  un ítem de `BACKLOG.md` aparte. Tampoco es licencia para abstraer
  preventivamente ante un caso hipotético que todavía no existe — eso
  sigue evitándose igual que antes.

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
- No agregar funcionalidades fuera de alcance (RBAC, multi-tenant, pagos, metas de calorías, export/import, borrado de cuenta) sin confirmar antes con el usuario si corresponde actualizar el PRD (ver gate de documentos rectores en la skill `flujo-backlog`).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
