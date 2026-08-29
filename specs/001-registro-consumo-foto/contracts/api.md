# API Contracts: Registro de Consumo Dietario a partir de Foto

**Feature**: `001-registro-consumo-foto` | **Fecha**: 2026-08-25

Rutas de Next.js App Router bajo `app/api/`. Todas (salvo
`auth/magic-link` y `auth/verify`) requieren sesión vigente vía cookie
`httpOnly` (FR-001); sin sesión válida responden `401`. Todas las
respuestas de error usan `{ "error": string }`.

## Autenticación

### `POST /api/auth/magic-link`
Solicita un link de acceso (RF-03).

- **Body**: `{ "email": string }`
- **200**: `{ "ok": true }` — no revela si el email ya existía (crea la
  cuenta automáticamente si no existía — FR-003a). Invalida cualquier
  link previo no usado de ese email (FR-004a) y envía el nuevo por email.
- **400**: email ausente o con formato inválido.

### `GET /api/auth/verify?token=...`
Valida un magic link y crea la sesión (FR-004, FR-005).

- **200**: setea cookie de sesión `httpOnly; Secure; SameSite=Lax` y
  redirige (`302`) al tablero principal.
- **401**: token inexistente, ya usado, o expirado (> 15 min) → mensaje
  indicando que debe solicitar un nuevo link.

### `POST /api/auth/logout`
Cierra la sesión activa (FR-007). Requiere confirmación ya resuelta en la
UI antes de llamar a este endpoint.

- **200**: `{ "ok": true }`, limpia cookie y `session_token_hash` en DB.

## Tablero

### `GET /api/resumen-dia`
Agregado de consumos del día actual del usuario autenticado (FR-009).

- **Query** (obligatorio): `?fecha=YYYY-MM-DD` — la fecha de "hoy" según
  el dispositivo del cliente, no un rango arbitrario: el servidor no
  conoce la zona horaria del usuario, así que el cliente calcula su
  propio "hoy" local y lo envía en cada llamada (mismo criterio de
  timezone que el historial — ver [[../research.md]] §9). FR-009 sólo
  exige agregados del día actual; este endpoint no sirve para consultar
  otras fechas.
- **200**:
  ```json
  {
    "totalCalorias": 0,
    "desglose": { "carbohidratos": 0, "proteinas": 0, "grasas": 0, "otrosNutrientes": 0 }
  }
  ```
  Todo en cero si no hay consumos ese día (acceptance scenario US1 #9).
  El desglose siempre suma exactamente 100 cuando `totalCalorias > 0`.
- **400**: falta `fecha` o no tiene formato `YYYY-MM-DD`.

## Análisis de imagen (sin persistencia — RNF-07)

### `POST /api/consumos/analizar`
Recibe una imagen, la analiza vía el módulo de IA (`lib/ai/vision.ts`) y
devuelve la estimación. Nunca persiste la imagen (FR-031).

- **Body**: `multipart/form-data` con campo `imagen` (JPEG/PNG/WebP, ≤10MB
  — FR-015a; rechazo antes de tocar el modelo de visión si no cumple).
- **200**:
  ```json
  {
    "descripcion": "string breve, no vacía",
    "calorias": 0,
    "desglose": { "carbohidratos": 0, "proteinas": 0, "grasas": 0, "otrosNutrientes": 0 },
    "confianza": 0.0
  }
  ```
  `confianza` es un valor 0–1 agregado por imagen (FR-027), usado sólo en
  el cliente para decidir si exigir edición manual (≤ 0.70) — no se
  reenvía al guardar (no se persiste, ver `data-model.md`).
- **400**: imagen ausente, formato no soportado, o > 10MB.
- **422**: el modelo no pudo identificar alimentos (Principio III: sin
  invención de datos) → cliente ofrece carga manual.
- **504**: excede 30s de procesamiento (FR-021) → cliente ofrece carga
  manual.

## Consumos

### `POST /api/consumos`
Guarda un consumo ya revisado/confirmado (FR-015, FR-024).

- **Body**:
  ```json
  {
    "descripcion": "string no vacía, hasta 200 caracteres",
    "calorias": 0,
    "desglose": { "carbohidratos": 0, "proteinas": 0, "grasas": 0, "otrosNutrientes": 0 }
  }
  ```
- **201**: `{ "id": "uuid", "fechaHora": "ISO-8601" }`.
- **400**: `descripcion` vacía o de más de 200 caracteres (FR-017,
  aplicable igual si vino del modelo, de carga manual o de edición del
  usuario — FR-023, FR-024), `calorias < 0`, desglose no entero, o
  desglose que no suma 100 (reforzado por el `CHECK` de `data-model.md`).
- **500**: error de guardado (red/DB) — cliente conserva los datos en
  pantalla y puede reintentar el mismo POST sin perder la revisión/edición
  (FR-024a, User Story 2 escenario 11).

No existe `PUT`/`PATCH /api/consumos/:id` — un consumo guardado no se
edita (FR-034a).

### `GET /api/consumos`
Lista los consumos propios del usuario autenticado, para el historial
(FR-032, FR-033).

- **Sin query params**: devuelve siempre el listado completo del usuario;
  no hay paginación por rango de fechas (no lo exige ningún FR — SC-005
  sólo pide poder ubicar un consumo de los últimos 12 meses navegando el
  agrupamiento jerárquico, no un buscador ni un filtro). Si en el futuro
  se necesita paginar historiales muy largos, eso requiere primero
  actualizar `spec.md` (Principio V — Disciplina de Alcance).
- **200**: `{ "consumos": [ { "id", "fechaHora", "descripcion", "calorias" } ] }`
  ordenados por `fechaHora` descendente. El agrupamiento jerárquico
  semana/mes/año se arma en el cliente. Array vacío si no hay consumos
  (la UI muestra el mensaje de estado vacío, no la API).

### `DELETE /api/consumos/:id`
Elimina un consumo propio (FR-034, US5). Idempotente: `404` si ya no
existe o no pertenece al usuario (FR-035 — nunca revela si pertenece a
otro usuario, sólo "no encontrado").

- **200**: `{ "ok": true }`.
- **404**: no existe o pertenece a otro usuario.

## Notas de seguridad transversales (FR-035)

Todo endpoint que reciba un `id` de consumo DEBE filtrar por
`usuario_id = sesión.usuarioId` en la consulta SQL misma (no sólo
verificar después de leer) — un intento de acceder al consumo de otro
usuario debe comportarse igual que un `id` inexistente (`404`), sin
distinguir "no existe" de "no es tuyo".
