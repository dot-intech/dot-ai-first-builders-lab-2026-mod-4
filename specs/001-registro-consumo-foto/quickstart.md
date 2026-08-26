# Quickstart: Validación de Registro de Consumo Dietario a partir de Foto

**Feature**: `001-registro-consumo-foto` | **Fecha**: 2026-08-25

Guía para validar end-to-end que la feature funciona, una vez implementada.
No incluye código de implementación — sólo pasos ejecutables y resultados
esperados. Ver `contracts/api.md` y `data-model.md` para el detalle de cada
pieza.

## Prerrequisitos

```bash
npm install
docker compose up -d        # levanta PostgreSQL
```

Variables requeridas en `.env.local` (ninguna se commitea — Principio IV):

```
DATABASE_URL=postgres://...
GOOGLE_AI_API_KEY=...
RESEND_API_KEY=...
EMAIL_FROM=...
```

Aplicar la migración inicial (`lib/db/migrations/0001_init.sql`) contra la
base levantada por Docker Compose antes de continuar.

```bash
npm run dev                 # app en http://localhost:3000
npm test                    # suite Vitest (unit + integration + contract)
```

## Escenario 1 — Autenticación y tablero vacío (User Story 1)

1. Abrir `http://localhost:3000` sin sesión → **esperado**: redirige a
   `/login`, mostrando sólo nombre/logo y "Obtener link de acceso" (RF-02).
2. Ingresar un email nuevo y solicitar el link → **esperado**: `200` de
   `POST /api/auth/magic-link`, llega un email con un link de un solo uso.
3. Abrir el link recibido → **esperado**: `GET /api/auth/verify` redirige
   al tablero con saludo de bienvenida; se creó automáticamente una fila en
   `usuarios` para ese email (FR-003a).
4. En el tablero, sin haber cargado ningún consumo → **esperado**: dona y
   total de calorías en cero (US1, escenario 9).
5. Reabrir el mismo link ya usado → **esperado**: `401`, mensaje pidiendo
   solicitar uno nuevo (FR-004).
6. Solicitar un segundo link para el mismo email y luego intentar el
   primer link (no usado) → **esperado**: `401` — quedó invalidado al
   emitirse el segundo (FR-004a).

## Escenario 2 — Registrar un consumo por cámara (User Story 2, P1)

1. Desde el tablero, elegir "Nuevo" → cámara, capturar una foto de un
   plato de comida real → **esperado**: indicador de procesamiento visible
   mientras `POST /api/consumos/analizar` está en curso.
2. Al completar (< 10s p95 en red normal) → **esperado**: se muestra
   descripción breve no vacía, calorías estimadas, desglose en 4
   categorías sumando 100%, y la nota de "puede ser inexacta" (FR-026).
3. Editar la descripción, calorías y desglose antes de guardar →
   **esperado**: los cambios se reflejan en pantalla; el desglose sigue
   validándose para sumar 100% y las calorías no admiten negativos.
4. Confirmar guardado → **esperado**: `POST /api/consumos` responde `201`,
   redirige al tablero, y la dona se actualiza al instante con el nuevo
   consumo incluido (FR-012).
5. Repetir con una imagen que produzca confianza < 70% (o forzarlo con un
   doble de prueba del módulo de IA en un test de integración) →
   **esperado**: aviso de baja confianza, opción de recargar imagen, y el
   botón de guardar deshabilitado hasta editar manualmente descripción y
   calorías (FR-028, FR-029).
6. Cancelar en cualquier paso del flujo → **esperado**: vuelve al tablero,
   sin ninguna fila nueva en `consumos` (FR-030).

## Escenario 3 — Cero persistencia de imágenes (RNF-07 / SC-002)

Test de integración (no manual): hacer `POST /api/consumos/analizar` con
una imagen de prueba y luego verificar:
- Ningún archivo nuevo bajo el directorio de trabajo del proceso.
- Ninguna fila en `consumos` contiene el buffer ni una referencia a él
  (la tabla no tiene columna capaz de almacenarlo — ver `data-model.md`).
- Los logs del proceso no contienen el base64 ni los bytes de la imagen.

## Escenario 4 — Carga desde galería (User Story 3, P2)

Repetir el Escenario 2 eligiendo "Nuevo" → galería en vez de cámara →
**esperado**: mismo comportamiento de análisis, revisión y guardado.

## Escenario 5 — Historial (User Story 4, P2)

1. Con al menos dos consumos guardados en fechas distintas, ir a
   "Historial" → **esperado**: sólo los consumos propios, orden
   descendente, agrupados por semana/mes/año.
2. Intentar acceder (manipulando el `id` en la URL/API) a un consumo de
   otro usuario → **esperado**: `404` de `GET /api/consumos/:id` o
   equivalente, sin distinguir "no existe" de "no es tuyo" (FR-035).
3. Un usuario sin consumos → **esperado**: mensaje explícito de estado
   vacío, no una lista en blanco.
4. Ver el detalle de un consumo guardado → **esperado**: no hay opción de
   editar, sólo de eliminar (FR-034a).

## Escenario 6 — Eliminar un consumo (User Story 5, P3)

1. Desde el historial, eliminar un consumo propio → **esperado**: pide
   confirmación, advierte que es irreversible.
2. Confirmar → **esperado**: `DELETE /api/consumos/:id` responde `200`,
   desaparece del historial y ya no se contabiliza en el tablero del día
   correspondiente.

## Escenario 7 — Sesión por inactividad

Simular (en test de integración, ajustando `session_last_activity_at`
directamente en DB a más de 8h atrás) una sesión inactiva → **esperado**:
la siguiente request autenticada devuelve `401` y la UI exige un nuevo
magic link (FR-006).

## Criterio de éxito de este quickstart

Todos los escenarios anteriores pasan (manualmente los que involucran
cámara/galería reales; automatizados vía Vitest los de contrato/integración)
antes de considerar la feature lista para revisión, junto con
`npm test` en verde (Principio I).
