# AGENTS.md

## Propósito
NutraShot es una app web que permite registrar el consumo dietario diario a partir de una foto del plato. La app identifica los alimentos, estima calorías y desglose nutricional, y lleva un historial persistente por usuario.

## Stack
- Next.js 15 (App Router) — fullstack, frontend + backend en un solo proyecto.
- Node.js 20 LTS, npm como gestor de paquetes.
- PostgreSQL, levantada vía Docker Compose en desarrollo (tablas: usuarios, consumos).
- Vitest para tests.
- Google AI Studio, modelo `gemini-3.1-flash-lite`, para el análisis de imágenes.

## Cómo correr
```bash
npm install
docker compose up -d        # levanta PostgreSQL
npm run dev                 # levanta la app en modo desarrollo
npm test                    # corre la suite de tests con Vitest
```
Requiere `GOOGLE_AI_API_KEY` definida en `.env.local` para el análisis de imágenes.

## Qué NO hacer
- No persistir imágenes provistas por el usuario en el backend bajo ninguna circunstancia (RNF-07: 0 persistencia de imágenes, por privacidad).
- No implementar login/registro por contraseña: la autenticación es exclusivamente vía magic link enviado por email (RF-03).
- No agregar funcionalidades fuera de alcance (RBAC, multi-tenant, pagos, metas de calorías, export/import, borrado de cuenta) sin antes actualizar el PRD.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
