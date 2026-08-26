# Data Model: Registro de Consumo Dietario a partir de Foto

**Feature**: `001-registro-consumo-foto` | **Fecha**: 2026-08-25

Esquema acotado a las dos tablas permitidas por la constitución:
`usuarios` y `consumos` (ver [[research.md]] §2 sobre por qué sesión y
magic link no tienen tablas propias).

## Usuario (`usuarios`)

Persona autenticada por email; dueña exclusiva de sus consumos.

| Columna                     | Tipo                     | Reglas |
|------------------------------|---------------------------|--------|
| `id`                         | `uuid` (PK, default gen)  | — |
| `email`                      | `text`, `UNIQUE NOT NULL` | Identifica al usuario; se crea automáticamente en el primer pedido de magic link (FR-003a) |
| `created_at`                 | `timestamptz NOT NULL default now()` | — |
| `magic_link_token_hash`      | `text NULL`               | SHA-256 del token vigente; `NULL` si no hay link pendiente |
| `magic_link_expires_at`      | `timestamptz NULL`        | Vence a los 15 min de emitido (FR-005) |
| `magic_link_used_at`         | `timestamptz NULL`        | Se setea al usarse; un token usado no vuelve a aceptarse (FR-004) |
| `session_token_hash`         | `text NULL`               | SHA-256 del token de sesión activa; `NULL` si no hay sesión |
| `session_last_activity_at`   | `timestamptz NULL`        | Se actualiza en cada request autenticado; sesión expira a las 8h de inactividad (FR-006) |

**Reglas de negocio**:
- Emitir un nuevo magic link SOBREESCRIBE `magic_link_token_hash` /
  `magic_link_expires_at` / `magic_link_used_at` (→ `NULL`), invalidando
  automáticamente cualquier link anterior no usado (FR-004a).
- Validar un magic link exitosamente: setea `magic_link_used_at`, limpia el
  propio token (no reutilizable — FR-004), y crea una nueva sesión
  (`session_token_hash` + `session_last_activity_at = now()`).
- Cerrar sesión (FR-007) o expiración por inactividad (FR-006): limpia
  `session_token_hash` y `session_last_activity_at`.
- No existe columna alguna para almacenar imágenes (garantiza RNF-07 a
  nivel de esquema).

## Consumo (`consumos`)

Registro de una comida cargada por un usuario, a partir de una foto (o
carga manual tras error de procesamiento).

| Columna              | Tipo                        | Reglas |
|-----------------------|------------------------------|--------|
| `id`                  | `uuid` (PK, default gen)     | — |
| `usuario_id`          | `uuid NOT NULL` (FK → `usuarios.id`) | Dueño exclusivo (FR-035) |
| `fecha_hora`          | `timestamptz NOT NULL default now()` | Momento del registro; usado para el tablero del día y el historial |
| `descripcion`         | `text NOT NULL CHECK (char_length(descripcion) <= 120)` | Breve y concisa, no vacía, hasta 120 caracteres (FR-017); mismo límite se aplica venga del modelo, de carga manual o de edición del usuario (FR-023, FR-024); incluye bebida si aplica |
| `calorias`            | `numeric NOT NULL CHECK (calorias >= 0)` | Estimadas o editadas, siempre ≥ 0 (FR-024) |
| `pct_carbohidratos`   | `smallint NOT NULL`          | Entero 0–100 |
| `pct_proteinas`       | `smallint NOT NULL`          | Entero 0–100 |
| `pct_grasas`          | `smallint NOT NULL`          | Entero 0–100 |
| `pct_otros_nutrientes`| `smallint NOT NULL`          | Entero 0–100 |
| `created_at`          | `timestamptz NOT NULL default now()` | Auditoría interna |

**Constraint a nivel de base**: `CHECK (pct_carbohidratos + pct_proteinas +
pct_grasas + pct_otros_nutrientes = 100)` — refuerza FR-010/FR-023/FR-024
también contra escrituras que no pasen por la capa de aplicación.

**Reglas de negocio** (aplicadas en `lib/consumos/nutricion.ts` antes de
llegar a la base, y reforzadas por el CHECK anterior):
- El desglose debe sumar exactamente 100%, tanto si viene del modelo de
  visión como si el usuario lo edita a mano o lo carga manualmente
  (FR-023, FR-024).
- Una vez guardado, un consumo **no se edita** — sólo se elimina
  (FR-034a). No existe endpoint `PUT`/`PATCH` para `consumos`.
- El nivel de confianza de la estimación (FR-027) es **transitorio**: vive
  sólo en el estado del cliente durante la revisión previa al guardado: no
  tiene columna en esta tabla.

## Agregados derivados (no persistidos)

- **Total de calorías del día** y **desglose nutricional agregado** del
  tablero (FR-009): se calculan on-the-fly con una consulta `SUM`/`AVG`
  sobre `consumos` filtrando `usuario_id` y `fecha_hora::date = hoy` (zona
  horaria del dispositivo aplicada en el cliente al definir "hoy" — ver
  [[research.md]] §9). No se materializan en una tabla propia.
- **Agrupamiento jerárquico del historial** (semana/mes/año — FR-033): se
  calcula en el cliente a partir de la lista plana de consumos devuelta
  por la API, ordenada por `fecha_hora DESC`.

## Migración inicial

`lib/db/migrations/0001_init.sql` crea ambas tablas con las columnas y
constraints de arriba, más los índices:
- `usuarios(email)` único (ya cubierto por `UNIQUE`).
- `consumos(usuario_id, fecha_hora DESC)` — soporta las consultas de
  tablero (día actual) e historial (orden descendente) eficientemente.
