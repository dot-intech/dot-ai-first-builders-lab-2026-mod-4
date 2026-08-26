# Implementation Plan: Registro de Consumo Dietario a partir de Foto

**Branch**: `001-registro-consumo-foto` | **Date**: 2026-08-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-registro-consumo-foto/spec.md`

## Summary

NutraShot permite a un usuario autenticarse por magic link, ver un tablero
diario con un gráfico de dona (calorías + desglose nutricional), registrar
un nuevo consumo fotografiando su plato (cámara o galería) — el sistema
analiza la imagen vía Google AI Studio (`gemini-3.1-flash-lite`), muestra
una estimación editable, y la guarda sin persistir jamás la imagen — y
consultar/eliminar consumos desde un historial jerárquico (semana/mes/año),
siempre acotado a los propios datos del usuario.

Enfoque técnico: Next.js 15 (App Router) fullstack en un solo proyecto,
PostgreSQL con acceso directo vía `pg` (sin ORM) y esquema limitado a
`usuarios`/`consumos` por restricción de la constitución, sesión y magic
link modelados como columnas de `usuarios` (sin tablas adicionales), un
módulo `lib/ai/vision.ts` aislado para toda interacción con el modelo de
visión, y Vitest para tests unitarios/integración/contrato siguiendo TDD
estricto. Ver [research.md](./research.md) para el detalle de cada
decisión y sus alternativas descartadas.

## Technical Context

**Language/Version**: TypeScript 5.x sobre Next.js 15 (App Router), Node.js 20 LTS

**Primary Dependencies**: Next.js 15, React 19, `pg` (node-postgres), `resend` (email transaccional), `@google/generative-ai` (Google AI Studio / Gemini), Vitest

**Storage**: PostgreSQL (Docker Compose en desarrollo), esquema limitado a `usuarios` y `consumos` — ver [data-model.md](./data-model.md)

**Testing**: Vitest (unit, integration, contract) — route handlers de App Router invocados directamente, sin servidor HTTP real (ver research.md §10)

**Target Platform**: Web app responsive, uso principal desde navegador móvil (cámara/galería vía `<input type="file">`)

**Project Type**: Web — proyecto único Next.js fullstack (frontend + backend en el mismo codebase, sin directorios `backend/`/`frontend/` separados; ver AGENTS.md)

**Performance Goals**: Análisis de imagen completo (carga → estimación mostrada) < 10s p95 bajo 4G (FR-022/SC-001); timeout duro de procesamiento a los 30s (FR-021)

**Constraints**: Cero persistencia de imágenes bajo ninguna circunstancia — disco, DB, logs (RNF-07/SC-002); desglose nutricional siempre en enteros que suman exactamente 100% (FR-010); ningún dato nutricional inventado fuera de la respuesta del modelo (Principio III)

**Scale/Scope**: MVP de alcance acotado por el PRD (single-tenant, sin metas numéricas de usuarios concurrentes); 5 user stories (2×P1, 2×P2, 1×P3), 2 tablas de datos

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio / Restricción | Estado | Cómo se cumple |
|---|---|---|
| I. Test-First (NON-NEGOTIABLE) | PASS | `/speckit-tasks` deberá generar, para cada historia de usuario, tareas de test antes que las de implementación (rojo→verde→refactor); este plan no escribe código todavía. |
| II. Aislamiento de Lógica de IA | PASS | Único punto de contacto con Google AI Studio en `lib/ai/vision.ts`; ningún otro módulo importa el SDK de Gemini (research.md §5). |
| III. Cero Invención de Datos | PASS | El módulo de IA reporta explícitamente lo que el modelo no identificó (p. ej. "no identificado"); ningún fallback inventa valores nutricionales. |
| IV. Gestión de Secretos | PASS | `GOOGLE_AI_API_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `DATABASE_URL` sólo vía `.env.local`/entorno de despliegue; ninguno se commitea. |
| V. Disciplina de Alcance (PRD-Bound) | PASS | Sin RBAC, multi-tenant, pagos, metas de calorías, export/import ni borrado de cuenta; esquema limitado a `usuarios`/`consumos`. |
| Restricción de esquema (constitución) | PASS | Sesión y magic link se modelan como columnas de `usuarios`, no como tablas nuevas (research.md §2, data-model.md). |
| RNF-07 — Cero persistencia de imágenes | PASS | La imagen vive sólo en memoria durante el request de análisis; ninguna columna de `consumos` puede almacenarla (research.md §6). |
| RF-03 — Sin login por contraseña | PASS | Única vía de entrada: magic link por email (contracts/api.md). |

Sin violaciones — no aplica la sección "Complexity Tracking".

*Re-check post Fase 1*: el diseño de datos y contratos (data-model.md,
contracts/api.md) no introdujo ninguna tabla, dependencia ni
funcionalidad fuera de lo ya evaluado arriba. Gate sigue en PASS.

## Project Structure

### Documentation (this feature)

```text
specs/001-registro-consumo-foto/
├── plan.md              # Este archivo (/speckit-plan)
├── research.md          # Fase 0 (/speckit-plan)
├── data-model.md         # Fase 1 (/speckit-plan)
├── quickstart.md         # Fase 1 (/speckit-plan)
├── contracts/
│   └── api.md             # Fase 1 (/speckit-plan)
├── checklists/
│   └── general.md         # /speckit-checklist (ya resuelto)
└── tasks.md              # Fase 2 (/speckit-tasks — no generado por este comando)
```

### Source Code (repository root)

Opción "Single project" — Next.js 15 fullstack en un solo proyecto, tal
como exige `AGENTS.md` (no hay `backend/`/`frontend/` separados: las rutas
`app/api/*` son el backend y el resto de `app/` es el frontend, en el
mismo codebase y el mismo `package.json`).

```text
app/
├── layout.tsx
├── page.tsx                       # redirige a /login o /tablero según sesión (FR-001)
├── login/
│   └── page.tsx                   # RF-02: pantalla de inicio de sesión
├── tablero/
│   └── page.tsx                   # US1: dona + acciones [Nuevo, Historial, Cerrar Sesión]
├── nuevo/
│   └── page.tsx                   # US2/US3: captura → revisión/edición → guardado
├── historial/
│   └── page.tsx                   # US4: listado jerárquico + eliminar (US5)
└── api/
    ├── auth/
    │   ├── magic-link/route.ts    # POST — solicitar link (RF-03, FR-003a, FR-004a)
    │   ├── verify/route.ts        # GET — validar token y crear sesión (FR-004, FR-005)
    │   └── logout/route.ts        # POST — cerrar sesión (FR-007)
    ├── resumen-dia/route.ts       # GET — agregados del tablero (FR-009)
    └── consumos/
        ├── route.ts               # GET (historial) / POST (guardar consumo)
        ├── [id]/route.ts          # DELETE (US5, FR-034)
        └── analizar/route.ts      # POST — analiza imagen sin persistirla (FR-016..FR-031)

lib/
├── db/
│   ├── pool.ts                    # cliente pg (Pool)
│   └── migrations/
│       └── 0001_init.sql          # tablas usuarios, consumos (data-model.md)
├── auth/
│   ├── magic-link.ts              # generación/validación/invalidación de tokens
│   ├── session.ts                 # cookies, expiración por 8h de inactividad
│   └── guard.ts                   # helper para proteger rutas/endpoints (FR-001, FR-035)
├── ai/
│   └── vision.ts                  # único punto de contacto con Google AI Studio (Principio II)
├── email/
│   └── send-magic-link.ts         # envío vía Resend (research.md §4)
└── consumos/
    ├── nutricion.ts               # validación: desglose suma 100%, calorías ≥ 0
    └── agregados.ts               # cálculo de totales del día para el tablero

components/
├── DonaNutricional.tsx            # gráfico SVG/CSS propio (research.md §7)
├── AccionesTablero.tsx
├── CapturaImagen.tsx              # inputs de cámara/galería (research.md §8)
├── RevisionConsumo.tsx            # edición pre-guardado, modo prellenado (éxito) y vacío (carga manual), + aviso de baja confianza
└── HistorialLista.tsx             # agrupamiento cliente por semana/mes/año

tests/
├── unit/                          # lib/consumos, lib/auth (funciones puras)
├── integration/                   # rutas API con DB de prueba + doble de lib/ai
└── contract/                      # valida request/response de cada ruta contra contracts/api.md

docker-compose.yml                  # PostgreSQL de desarrollo
.env.local.example                  # placeholders de las variables de research.md §4 y AGENTS.md
```

**Structure Decision**: Proyecto único Next.js (App Router) tal como fija
`AGENTS.md` — no se usa la variante "Web application" con `backend/` y
`frontend/` separados porque ambos viven en el mismo proyecto Next.js por
requisito explícito del stack.

## Complexity Tracking

*No aplica — Constitution Check sin violaciones (ver tabla arriba).*
