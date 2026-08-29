---

description: "Task list for feature 001-registro-consumo-foto (NutraShot)"
---

# Tasks: Registro de Consumo Dietario a partir de Foto

**Input**: Documentos de diseño en `/specs/001-registro-consumo-foto/`
(`plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/api.md`,
`quickstart.md`)

**Tests**: Incluidos y OBLIGATORIOS — el Principio I de la constitución
("Test-First (NON-NEGOTIABLE)") exige TDD estricto (rojo→verde→refactor)
para toda lógica de negocio, endpoints y módulos de integración con IA. No
se debe implementar ninguna tarea marcada `[Implementación]` antes de que
su(s) test(s) precedente(s) estén escritos y fallando.

**Organization**: Las tareas están agrupadas por historia de usuario
(spec.md) para permitir implementación y prueba independientes de cada
una.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin
  dependencias entre sí)
- **[Story]**: Historia de usuario a la que pertenece (US1..US5)
- Cada tarea incluye la ruta de archivo exacta

## Path Conventions

Proyecto único Next.js 15 (App Router) fullstack, tal como fija
`AGENTS.md` y `plan.md` — ver ahí el árbol completo. Rutas relevantes:
`app/`, `app/api/`, `lib/`, `components/`, `tests/{unit,integration,contract}/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Inicialización del proyecto Next.js y herramientas base.

- [X] T001 Crear el proyecto Next.js 15 (App Router, TypeScript) en la raíz
      del repo: `package.json`, `tsconfig.json`, `next.config.ts`,
      `app/layout.tsx` mínimo — según la estructura de `plan.md`
- [X] T002 Agregar dependencias de producción en `package.json`: `next`,
      `react`, `react-dom`, `pg`, `resend`, `@google/generative-ai`
- [X] T003 [P] Agregar dependencias de desarrollo en `package.json` y
      configurar `vitest.config.ts` con proyectos separados para
      `tests/unit`, `tests/integration`, `tests/contract`
- [X] T004 [P] Configurar ESLint + TypeScript estricto (`tsconfig.json`
      `strict: true`, `.eslintrc`) por sobre el scaffold de Next.js
- [X] T005 [P] Crear `docker-compose.yml` con el servicio de PostgreSQL de
      desarrollo (según "Cómo correr" de `AGENTS.md`)
- [X] T006 [P] Crear `.env.local.example` con placeholders de
      `DATABASE_URL`, `GOOGLE_AI_API_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`
      (Principio IV — nunca valores reales)

**Nota**: antes de escribir cualquier código de aplicación en las fases
siguientes, leer `node_modules/next/dist/docs/` una vez instalado
(`npm install`) — ver nota final de `research.md` sobre cambios de esta
versión de Next.js respecto al conocimiento de entrenamiento del agente.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestructura y lógica de negocio compartida que TODAS las
historias de usuario necesitan.

**⚠️ CRITICAL**: Ninguna historia de usuario empieza hasta completar esta
fase.

### Esquema de base de datos

- [X] T007 Escribir la migración `lib/db/migrations/0001_init.sql` con las
      tablas `usuarios` y `consumos`, columnas y `CHECK` constraints
      exactos de `data-model.md` (incluye el `CHECK` de que el desglose
      suma 100 y de `calorias >= 0`), más el índice
      `consumos(usuario_id, fecha_hora DESC)`
- [X] T008 Implementar `lib/db/pool.ts` (cliente `pg.Pool` leyendo
      `DATABASE_URL`)

### Lógica de negocio pura (nutrición)

- [X] T009 [P] Test unitario en `tests/unit/nutricion.test.ts` para
      `lib/consumos/nutricion.ts`: desglose que suma 100% pasa, que no
      suma 100% falla, calorías negativas rechazadas, calorías ≥ 0
      aceptadas, descripción vacía rechazada, descripción de más de 120
      caracteres rechazada (FR-010, FR-017, FR-023, FR-024) — sin
      distinguir si la descripción vino del modelo, de carga manual o de
      edición del usuario — escribir y ver fallar primero
- [X] T010 [P] Implementar `lib/consumos/nutricion.ts` para pasar T009

### Agregados del tablero

- [X] T011 [P] Test unitario en `tests/unit/agregados.test.ts` para
      `lib/consumos/agregados.ts`: suma correcta de calorías/desglose de
      una lista de consumos, y resultado en cero con lista vacía (FR-009,
      escenario US1 #9) — escribir y ver fallar primero
- [X] T012 [P] Implementar `lib/consumos/agregados.ts` para pasar T011

### Magic link — helpers puros

- [X] T013 [P] Test unitario en `tests/unit/magic-link.test.ts` para las
      funciones puras de `lib/auth/magic-link.ts` (generación de token
      aleatorio, hash SHA-256, cálculo de expiración a 15 min) — escribir
      y ver fallar primero
- [X] T014 Implementar las funciones puras de `lib/auth/magic-link.ts`
      para pasar T013

### Magic link — persistencia (depende de T007, T008, T014)

- [X] T015 Test de integración en `tests/integration/magic-link.test.ts`
      contra la base Dockerizada: emitir un link crea/reutiliza el
      `Usuario` (FR-003a), invalida automáticamente el link previo no
      usado al reemitir (FR-004a), un link usado no vuelve a aceptarse
      (FR-004), un link expirado (>15 min) se rechaza (FR-005) — escribir
      y ver fallar primero
- [X] T016 Implementar las funciones de persistencia de
      `lib/auth/magic-link.ts` (crear/validar/invalidar contra
      `usuarios`) para pasar T015

### Sesión — helpers puros

- [X] T017 [P] Test unitario en `tests/unit/session.test.ts` para las
      funciones puras de `lib/auth/session.ts` (generación/hash de token
      de sesión, cálculo de inactividad ≥ 8h) — escribir y ver fallar
      primero
- [X] T018 Implementar las funciones puras de `lib/auth/session.ts` para
      pasar T017

### Sesión — persistencia y guard (depende de T007, T008, T018)

- [X] T019 Test de integración en `tests/integration/session.test.ts`:
      validar un magic link crea una sesión activa, la sesión expira tras
      8h de inactividad (FR-006), logout limpia la sesión (FR-007), y un
      request sin sesión válida es rechazado — escribir y ver fallar
      primero
- [X] T020 Implementar las funciones de persistencia de
      `lib/auth/session.ts` y el helper `lib/auth/guard.ts` (exige sesión
      vigente y expone el `usuario_id` a las rutas protegidas — base de
      FR-001 y FR-035) para pasar T019

### Módulo de IA aislado (Principio II)

- [X] T021 [P] Test unitario en `tests/unit/vision.test.ts` para
      `lib/ai/vision.ts` con el SDK de Google AI Studio mockeado: el
      prompt exige respuesta en Español LatAm (FR-036), el parsing arma
      `{descripcion, calorias, desglose, confianza}`, `descripcion` no
      vacía y de hasta 120 caracteres (FR-017), y un alimento no
      identificado por el modelo se reporta explícitamente en vez de
      inventarse (Principio III) — escribir y ver fallar primero
- [X] T022 Implementar `lib/ai/vision.ts` (único punto de contacto con
      `@google/generative-ai` en todo el proyecto) para pasar T021

### Email transaccional

- [X] T023 [P] Test unitario en `tests/unit/send-magic-link.test.ts` para
      `lib/email/send-magic-link.ts` con el SDK de Resend mockeado
      (arma el email con el link correcto, usa `EMAIL_FROM`) — escribir y
      ver fallar primero
- [X] T024 [P] Implementar `lib/email/send-magic-link.ts` para pasar T023

**Checkpoint**: Fundación lista — infraestructura de datos, sesión, magic
link, IA y email disponibles y testeadas. Las historias de usuario pueden
empezar.

---

## Phase 3: User Story 1 - Autenticarse y ver el tablero principal (Priority: P1) 🎯 MVP

**Goal**: Un usuario puede pedir un magic link, autenticarse con él, y ver
el tablero principal con la dona (en cero si no hay consumos) y las
acciones [Nuevo, Historial, Cerrar Sesión].

**Independent Test**: Pedir un link con un email nuevo, entrar con él, y
verificar que se ve el tablero con saludo, dona en cero y las 3 acciones
(ver `quickstart.md` Escenario 1).

### Tests para User Story 1 ⚠️

- [X] T025 [P] [US1] Contract test `POST /api/auth/magic-link` en
      `tests/contract/auth-magic-link.test.ts` (200 con email válido, 400
      sin email o formato inválido) — ver `contracts/api.md`
- [X] T026 [P] [US1] Contract test `GET /api/auth/verify` en
      `tests/contract/auth-verify.test.ts` (200 + cookie de sesión con
      token vigente, 401 con token usado/expirado/inexistente)
- [X] T027 [P] [US1] Contract test `POST /api/auth/logout` en
      `tests/contract/auth-logout.test.ts` (200, limpia cookie y sesión)
- [X] T028 [P] [US1] Contract test `GET /api/resumen-dia` en
      `tests/contract/resumen-dia.test.ts` (200 con ceros si no hay
      consumos para el `?fecha=` recibido, agregados correctos con
      consumos en esa fecha, 400 si falta `fecha`, 401 sin sesión)
- [X] T029 [US1] Test de integración en
      `tests/integration/auth-dashboard.test.ts` cubriendo los
      acceptance scenarios 1-9 de US1 en `spec.md`: redirección sin
      sesión, alta automática de usuario nuevo (FR-003a), rechazo de link
      usado/expirado, invalidación por reemisión, expiración por 8h de
      inactividad, y tablero en cero sin consumos

### Implementación para User Story 1

- [X] T030 [US1] Implementar `app/api/auth/magic-link/route.ts` (POST)
      usando `lib/auth/magic-link.ts` + `lib/email/send-magic-link.ts`
      para pasar T025
- [X] T031 [US1] Implementar `app/api/auth/verify/route.ts` (GET) usando
      `lib/auth/magic-link.ts` + `lib/auth/session.ts` para pasar T026
- [X] T032 [US1] Implementar `app/api/auth/logout/route.ts` (POST) usando
      `lib/auth/session.ts` + `lib/auth/guard.ts` para pasar T027
- [X] T033 [US1] Implementar `app/api/resumen-dia/route.ts` (GET,
      requiere `?fecha=YYYY-MM-DD`, 400 si falta o es inválida) usando
      `lib/consumos/agregados.ts` + `lib/auth/guard.ts` para pasar T028
- [X] T034 [P] [US1] Implementar `app/login/page.tsx` (RF-02: sólo
      nombre/logo de la app y "Obtener link de acceso")
- [X] T035 [P] [US1] Implementar `components/DonaNutricional.tsx` (SVG/CSS
      propio, 4 categorías — ver `research.md` §7)
- [X] T036 [P] [US1] Implementar `components/AccionesTablero.tsx`
      ([Nuevo, Historial, Cerrar Sesión], con confirmación al cerrar
      sesión — FR-007)
- [X] T037 [US1] Implementar `app/tablero/page.tsx` (saludo de bienvenida,
      calcula la fecha local del dispositivo y consume `GET
      /api/resumen-dia?fecha=...`, usa `DonaNutricional` y
      `AccionesTablero`) — depende de T033, T035, T036
- [X] T038 [US1] Implementar `app/page.tsx` raíz: redirige a `/tablero` o
      `/login` según haya sesión vigente (FR-001) — depende de T020

**Checkpoint**: User Story 1 completamente funcional y testeable de forma
independiente (MVP mínimo de entrada a la app).

---

## Phase 4: User Story 2 - Registrar un consumo fotografiando el plato (Priority: P1)

**Goal**: Un usuario puede fotografiar su plato, obtener una estimación
editable de alimentos/calorías/desglose, y guardarla como un nuevo
consumo, sin que la imagen quede persistida.

**Independent Test**: Elegir "Nuevo" → cámara, verificar estimación en
<10s, editar si hace falta, confirmar, y ver el tablero actualizado (ver
`quickstart.md` Escenario 2).

### Tests para User Story 2 ⚠️

- [X] T039 [P] [US2] Contract test `POST /api/consumos/analizar` en
      `tests/contract/consumos-analizar.test.ts` (200 con estimación,
      400 formato no soportado o >10MB — FR-015a, 422 sin alimentos
      identificados, 504 si supera 30s — FR-021), con `lib/ai/vision.ts`
      mockeado; ADEMÁS asertar que el body de la respuesta 200 no
      contiene ningún campo con endpoint, payload crudo o nombre del
      modelo de visión (FR-020)
- [X] T040 [P] [US2] Contract test `POST /api/consumos` en
      `tests/contract/consumos-post.test.ts` (201 al guardar, 400 si
      calorías negativas, desglose no suma 100, descripción vacía o de
      más de 120 caracteres — FR-017/FR-023/FR-024, 500 simulando fallo
      de guardado)
- [X] T041 [US2] Test de integración en
      `tests/integration/nuevo-consumo.test.ts` cubriendo los acceptance
      scenarios 1-11 de US2: indicador de procesamiento, nota de "puede
      ser inexacta" (FR-026), estimación de baja confianza (≤70%) exige
      edición manual antes de guardar (FR-028/FR-029), error/timeout
      ofrece carga manual (FR-021/FR-023), guardado actualiza el tablero
      al instante (FR-012), cancelar en cualquier paso no persiste nada
      (FR-030), y reintento de guardado tras fallo sin perder los datos
      revisados (FR-024a, escenario 11); ADEMÁS medir el tiempo entre el
      envío de la imagen y la respuesta con la estimación mostrada, y
      asertar que quede por debajo de los 10s (FR-022/SC-001) con un
      `lib/ai/vision.ts` mockeado con latencia simulada representativa
- [X] T042 [US2] Test de integración en
      `tests/integration/cero-persistencia-imagen.test.ts` (RNF-07 /
      SC-002): tras `POST /api/consumos/analizar` con una imagen de
      prueba, verificar que no aparece ningún archivo nuevo en el
      filesystem del proceso, ninguna fila persistida contiene datos
      binarios de la imagen, y no queda rastro de sus bytes/base64 en la
      salida de logs capturada durante el test

### Implementación para User Story 2

- [X] T043 [US2] Implementar `app/api/consumos/analizar/route.ts` (POST,
      `multipart/form-data`, valida formato/tamaño antes de invocar
      `lib/ai/vision.ts`, nunca escribe la imagen a disco/DB/logs) para
      pasar T039 y T042
- [X] T044 [US2] Implementar el handler `POST` de `app/api/consumos/route.ts`
      (valida con `lib/consumos/nutricion.ts`, inserta en `consumos`
      filtrando por `usuario_id` de la sesión) para pasar T040
- [X] T045 [P] [US2] Implementar `components/CapturaImagen.tsx` (input de
      cámara `capture="environment"`, envío a `/api/consumos/analizar`,
      indicador de procesamiento)
- [X] T046 [P] [US2] Implementar `components/RevisionConsumo.tsx` en dos
      modos: (a) **prellenado**, tras un análisis exitoso (estimación del
      modelo cargada en los campos), y (b) **vacío**, tras un error o
      timeout de análisis (carga manual — FR-023); ambos comparten la
      misma validación cliente (descripción no vacía y ≤120 caracteres —
      FR-017, suma 100%/no-negativo — FR-024), aviso de baja confianza
      con opción de recargar imagen (sólo aplica al modo prellenado),
      nota de inexactitud, y reintento de guardado sin perder los datos
      en pantalla ante error 500 (FR-024a)
- [X] T047 [US2] Implementar `app/nuevo/page.tsx` orquestando
      captura → procesando → (éxito: revisión prellenada | error/timeout:
      carga manual vacía) → guardar/cancelar, redirigiendo al tablero al
      confirmar (FR-025) — depende de T043, T044, T045, T046

**Checkpoint**: User Stories 1 y 2 funcionan de forma independiente — MVP
completo del flujo central del producto.

---

## Phase 5: User Story 3 - Registrar un consumo desde una imagen de la galería (Priority: P2)

**Goal**: Un usuario puede elegir una imagen ya existente de la galería
en vez de tomar una foto nueva, con el mismo comportamiento de análisis,
revisión y guardado que User Story 2.

**Independent Test**: Elegir "Nuevo" → galería, seleccionar una imagen
existente, y verificar que el flujo se comporta igual que con cámara (ver
`quickstart.md` Escenario 4).

### Tests para User Story 3 ⚠️

- [X] T048 [US3] Test de integración en
      `tests/integration/nuevo-consumo-galeria.test.ts` cubriendo los
      acceptance scenarios 1-2 de US3: seleccionar imagen de galería
      sigue el mismo análisis/revisión/guardado que US2, y el consumo
      queda guardado igual que uno originado en cámara

### Implementación para User Story 3

- [X] T049 [US3] Extender `components/CapturaImagen.tsx` con la opción de
      galería (`<input type="file" accept="image/*">` sin `capture`) y
      un selector cámara/galería, reutilizando el resto del flujo de
      `app/nuevo/page.tsx` (T043-T047) para pasar T048

**Checkpoint**: User Stories 1-3 funcionan de forma independiente.

---

## Phase 6: User Story 4 - Consultar el historial de consumos (Priority: P2)

**Goal**: Un usuario puede ver sus propios consumos pasados, ordenados
descendente y agrupados jerárquicamente por semana/mes/año, sin ver datos
de otros usuarios ni poder editarlos.

**Independent Test**: Con consumos guardados en distintas fechas, entrar
a "Historial" y verificar el listado propio, ordenado y agrupado (ver
`quickstart.md` Escenario 5).

### Tests para User Story 4 ⚠️

- [X] T050 [P] [US4] Contract test `GET /api/consumos` en
      `tests/contract/consumos-get.test.ts` (200 con lista propia
      ordenada descendente, array vacío sin consumos, 401 sin sesión)
- [X] T051 [US4] Test de integración en `tests/integration/historial.test.ts`
      cubriendo los acceptance scenarios 1-5 de US4: sólo consumos
      propios (nunca de otro usuario — FR-035), orden descendente,
      intento de acceder a un consumo ajeno devuelve 404 sin distinguir
      "no existe" de "no es tuyo", mensaje de estado vacío sin consumos,
      y ninguna opción de edición sobre un consumo ya guardado (FR-034a)

### Implementación para User Story 4

- [X] T052 [US4] Implementar el handler `GET` de `app/api/consumos/route.ts`
      (lista filtrada por `usuario_id` de la sesión, orden
      `fecha_hora DESC`) para pasar T050
- [X] T053 [P] [US4] Implementar `components/HistorialLista.tsx`
      (agrupamiento por semana/mes/año en el cliente usando la zona
      horaria del dispositivo — `research.md` §9 —, mensaje explícito de
      estado vacío, sin opción de editar)
- [X] T054 [US4] Implementar `app/historial/page.tsx` consumiendo
      `GET /api/consumos` y `HistorialLista` — depende de T052, T053

**Checkpoint**: User Stories 1-4 funcionan de forma independiente.

---

## Phase 7: User Story 5 - Eliminar un consumo del historial (Priority: P3)

**Goal**: Un usuario puede eliminar, con confirmación, un consumo propio
desde el historial.

**Independent Test**: Desde "Historial", eliminar un consumo propio,
confirmar, y verificar que desaparece del listado y del tablero del día
correspondiente (ver `quickstart.md` Escenario 6).

### Tests para User Story 5 ⚠️

- [X] T055 [P] [US5] Contract test `DELETE /api/consumos/:id` en
      `tests/contract/consumos-delete.test.ts` (200 al eliminar un
      consumo propio, 404 si no existe o pertenece a otro usuario)
- [X] T056 [US5] Test de integración en
      `tests/integration/eliminar-consumo.test.ts` cubriendo los
      acceptance scenarios 1-2 de US5: pide confirmación, advierte que es
      irreversible, y sólo elimina si se confirma; tras eliminar, el
      consumo desaparece del historial y deja de contarse en el tablero
      del día correspondiente

### Implementación para User Story 5

- [X] T057 [US5] Implementar `app/api/consumos/[id]/route.ts` (DELETE,
      filtra por `usuario_id` de la sesión) para pasar T055
- [X] T058 [US5] Agregar la acción de eliminar con confirmación
      (advertencia de irreversibilidad) en `components/HistorialLista.tsx`
      — depende de T053, T057

**Checkpoint**: Las 5 historias de usuario funcionan de forma
independiente.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Validación final transversal a todas las historias.

- [X] T059 [P] Ejecutar manualmente los pasos con cámara/galería reales de
      `quickstart.md` (Escenarios 1-7) y documentar cualquier desvío;
      para el Escenario 2 (US2), repetir la captura al menos 10 veces con
      throttling de red 4G (DevTools) y registrar el p95 del tiempo entre
      captura y estimación mostrada, comparándolo contra el umbral de 10s
      (FR-022/SC-001); además revisar que todo el texto de la interfaz
      (botones, labels, mensajes de error) esté en Español LatAm (FR-036
      — el lado del modelo de visión ya queda cubierto por el test
      unitario T021; el de la UI se verifica sólo aquí, manualmente)
      — **Ejecutado 2026-08-27** con dispositivo/cámara reales, claves
      reales de `GOOGLE_AI_API_KEY`/`RESEND_API_KEY`, y throttling "Fast
      4G" en DevTools. Escenarios 1, 5 y 6 ya habían sido probados con
      smoke test previo; en esta corrida se probó E2E manual completo el
      login por magic link, tablero, historial y borrado, sin desvíos.
      FR-036 verificado manualmente: toda la interfaz en Español LatAm,
      sin texto en inglés.
      Medición de p95 (Escenario 2, 10 corridas bajo Fast 4G): 4.82s,
      9.88s, 11.0s, 19.29s, 20.97s(❌500), 22.52s, 25.34s(❌500),
      30.92s(❌504), 31.04s(❌504), 31.56s(❌504) → **p95 = 31.56s**.
      **RESULTADO: FR-022/SC-001 NO SE CUMPLE.** Sólo 2/10 corridas
      estuvieron bajo el umbral de 10s; 8/10 lo violaron y 5/10
      fallaron directamente (3× `504` por el timeout duro de 30s en
      `app/api/consumos/analizar/route.ts`, 2× `500` genérico por una
      excepción sin capturar en `lib/ai/vision.ts` — ver T059a).
      Éste es un hallazgo de performance real bajo red 4G con la API de
      Gemini real, no sólo un problema de la suite de tests con dobles.
- [X] T059a Capturar y loguear el error real del modelo/SDK en
      `analizarImagen` (`lib/ai/vision.ts`) en vez de dejar que la
      excepción suba sin manejar y termine en un `500` genérico sin
      contexto — hallazgo de T059 (2/10 corridas con Fast 4G terminaron
      en `500 "No pudimos analizar la imagen"` sin loguear la causa).
- [X] T059b Deshabilitar el razonamiento extendido del modelo
      (`generationConfig.thinkingConfig.thinkingBudget = 0` en
      `lib/ai/vision.ts`) como hipótesis para la latencia de T059 —
      probado con pruebas manuales sueltas tras el cambio: **sin mejora
      significativa** de latencia, calidad de estimaciones sin cambios
      perceptibles. Se dejó el cambio (config razonable por default)
      pero la causa raíz de la lentitud sigue abierta — ver
      `BACKLOG.md`.
- [X] T060 Verificar que `npm test` (Vitest, unit+integration+contract)
      pasa en verde en su totalidad (Principio I / Flujo de Desarrollo)
      — 98/98 tests, typecheck y `eslint` limpios.
- [X] T061 Revisar el diff completo de la feature contra los 5 principios
      de la constitución antes de dar por cerrada la implementación
      (aislamiento de IA, cero invención de datos, sin secretos
      commiteados, disciplina de alcance)
      — verificado: único import de `@google/generative-ai` en
      `lib/ai/vision.ts`; sin secretos hardcodeados; esquema limitado a
      `usuarios`/`consumos`; sin funcionalidad fuera de alcance.
- [X] T062 [P] Confirmar que `.env.local` está en `.gitignore` y que
      `.env.local.example` no contiene ningún valor real (Principio IV)
      — confirmado.

---

## Phase 9: Convergence

**Purpose**: Cerrar la brecha detectada por `/speckit-analyze` tras agregar
FR-034b (amend de spec, ítem de `BACKLOG.md` "volver al tablero desde el
historial") — sin cobertura de tarea todavía.

- [X] T063 [US4] Agregar en `app/historial/page.tsx` una opción visible
      (sin scroll adicional) para volver a `/tablero`, sin depender del
      botón "atrás" del navegador, para pasar FR-034b (missing) —
      verificación manual vía `quickstart.md` Escenario 5, paso 5; sin
      test automatizado dedicado, mismo patrón que T053/T054 (el proyecto
      no tiene RTL/jsdom, sólo tests de integración a nivel API/DB)
      — Implementado con `<Link href="/tablero">` de Next.js en
      `app/historial/page.tsx` (server component, no requiere lógica de
      cliente).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias — puede empezar de inmediato
- **Foundational (Phase 2)**: depende de Setup — BLOQUEA todas las
  historias de usuario
- **User Stories (Phase 3-7)**: todas dependen de Foundational completo
  - US1 (Phase 3) no depende de otras historias
  - US2 (Phase 4) no depende de US1 para su propia lógica, pero comparte
    el tablero de US1 para ser demostrable de punta a punta
  - US3 (Phase 5) reutiliza el flujo de US2 (mismo `app/nuevo/page.tsx`)
  - US4 (Phase 6) necesita que existan consumos guardados para tener algo
    que listar (generados por US2/US3), pero su implementación (ruta GET,
    página de historial) no depende del código de US2/US3
  - US5 (Phase 7) depende de la página de Historial de US4
    (`components/HistorialLista.tsx`)
- **Polish (Phase 8)**: depende de que todas las historias deseadas estén
  completas

### Dentro de cada historia

- Los tests se escriben y se ven fallar ANTES de la implementación
  correspondiente (Principio I, no negociable)
- Lógica pura antes que persistencia; persistencia antes que rutas API;
  rutas API antes que páginas/componentes que las consumen

### Oportunidades de paralelismo

- Todas las tareas [P] de Setup pueden correr en paralelo
- Dentro de Foundational: los tres pares test-primero-luego-implementación
  de lógica pura (T009-T010, T011-T012, T013-T014) pueden avanzar en
  paralelo entre sí; lo mismo T021-T022 (IA) y T023-T024 (email); los
  pares de persistencia (T015-T016, T019-T020) dependen de T007+T008 pero
  no entre sí
- Dentro de cada historia, los tests marcados [P] corren en paralelo entre
  sí (archivos de contrato distintos); los componentes de UI marcados [P]
  son independientes entre sí

---

## Parallel Example: Foundational (Phase 2)

```bash
# Lanzar juntos los tests de lógica pura (archivos distintos, sin dependencias):
Task: "Test unitario en tests/unit/nutricion.test.ts"
Task: "Test unitario en tests/unit/agregados.test.ts"
Task: "Test unitario en tests/unit/magic-link.test.ts"
Task: "Test unitario en tests/unit/session.test.ts"
Task: "Test unitario en tests/unit/vision.test.ts"
Task: "Test unitario en tests/unit/send-magic-link.test.ts"
```

## Parallel Example: User Story 1

```bash
# Lanzar juntos los contract tests de US1:
Task: "Contract test POST /api/auth/magic-link en tests/contract/auth-magic-link.test.ts"
Task: "Contract test GET /api/auth/verify en tests/contract/auth-verify.test.ts"
Task: "Contract test POST /api/auth/logout en tests/contract/auth-logout.test.ts"
Task: "Contract test GET /api/resumen-dia en tests/contract/resumen-dia.test.ts"

# Lanzar juntos los componentes de UI de US1 (tras los handlers de API):
Task: "Implementar components/DonaNutricional.tsx"
Task: "Implementar components/AccionesTablero.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 + User Story 2)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational (CRÍTICO — bloquea todo lo demás)
3. Completar Phase 3: User Story 1 → validar de forma independiente
4. Completar Phase 4: User Story 2 → validar de forma independiente
5. **STOP y VALIDAR**: en este punto ya existe el flujo de valor central
   del producto (autenticarse, fotografiar un plato, guardar el consumo,
   verlo reflejado en el tablero) — considerar demo/deploy

### Entrega incremental

1. Setup + Foundational → base lista
2. + US1 → demo (login + tablero vacío)
3. + US2 → demo (MVP: registrar consumo por cámara) 🎯
4. + US3 → demo (registrar también desde galería)
5. + US4 → demo (historial)
6. + US5 → demo (eliminar) → feature completa

---

## Notes

- [P] = archivos distintos, sin dependencias entre las tareas marcadas
- La etiqueta [Story] mapea cada tarea a su historia de usuario para
  trazabilidad contra `spec.md`
- Verificar siempre que el test falla antes de implementar (rojo→verde)
- Commitear tras cada tarea o grupo lógico de tareas relacionadas
- Detenerse en cada checkpoint para validar la historia de forma
  independiente antes de avanzar a la siguiente
