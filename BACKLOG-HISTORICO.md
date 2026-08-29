# Backlog histórico — NutraShot

Registro de los ítems de `BACKLOG.md` ya cerrados: qué se hizo, por qué
se resolvió así (o por qué se descartó una hipótesis), y cuándo. Sirve
para no volver a discutir desde cero algo ya decidido, y para que quede
constancia de intentos que **no** funcionaron (no sólo de los que sí).

Cuando un ítem de `BACKLOG.md` se cierra, se saca de ahí y se agrega acá
como entrada nueva (más reciente arriba) — no se deja tildado `[X]` en
`BACKLOG.md`. Ver `AGENTS.md` § Backlog.

---

## 2026-08-29 — Agregar una forma de volver al tablero desde el historial

**Problema:** `app/historial/page.tsx` no tenía ningún link/botón de
vuelta al tablero — la única forma de salir era el botón "atrás" del
navegador.

**Resolución:** primer ítem tomado con el flujo formal de `AGENTS.md`
§ "Flujo para tomar un ítem del backlog" (modificar spec existente, no
spec nueva): se agregó **FR-034b** a `spec.md` ("el Historial MUST
ofrecer una opción visible, sin scroll adicional, para volver al
tablero principal, sin depender del botón 'atrás'"), se corrió
`/speckit-clarify` (0 preguntas — sin ambigüedades de alto impacto) y
`/speckit-checklist` (checklist nuevo `navegacion-historial.md`, 5
ítems, resueltos de forma interactiva con el usuario), se agregó el
paso 5 al Escenario 5 de `quickstart.md`, `/speckit-analyze` no
encontró problemas críticos, y `/speckit-converge` agregó **T063** a
`tasks.md` (Phase 9: Convergence). Implementado con `<Link
href="/tablero">` de Next.js directo en `app/historial/page.tsx`
(server component, sin necesidad de lógica de cliente). Sin test
automatizado dedicado — mismo patrón que T053/T054 (el proyecto no
tiene RTL/jsdom, sólo tests de integración a nivel API/DB) —
verificado manualmente vía el paso agregado en `quickstart.md`. 98/98
tests, typecheck y `eslint` en verde tras el cambio.

**Por qué así (no otra alternativa):** no se creó una spec nueva
porque el cambio refina un área ya declarada (Historial, FR-032/FR-033)
sin introducir una capacidad nueva del producto; no se tocó
`research.md`/`data-model.md`/`contracts/api.md` porque es navegación
pura sobre datos que la pantalla ya obtiene (`GET /api/consumos`), sin
endpoint ni columna nueva.

**Nota de proceso:** primera vez que se usa el flujo completo
documentado en `AGENTS.md` de punta a punta — alcanzó sin tener que
volver a preguntarle al usuario cómo proceder en ningún paso del
pipeline de Spec Kit (sólo se consultaron decisiones de contenido del
checklist, como está previsto).

---

## 2026-08-28 — Separar la base de datos de tests de la de desarrollo

**Problema:** `vitest.config.ts` cargaba el mismo `.env.local` que usa
`npm run dev` (mismo `DATABASE_URL`, puerto 5433), y los tests de
integration/contract hacen `DELETE FROM consumos` / `DELETE FROM
usuarios` en `beforeEach`/`beforeAll` (ver por ejemplo
`tests/integration/auth-dashboard.test.ts:11-12`, mismo patrón en el
resto). **Consecuencia real ya sufrida:** correr `npm test` mientras
había datos reales cargados en la base de dev (usuario logueado,
consumos guardados) los borró sin aviso — pasó en la sesión
2026-08-27/28: se corrió `npm test` para validar el fix de T059a y eso
vació `usuarios`/`consumos`, cerrando la sesión real del usuario sin que
hubiera expirado por inactividad.

**Resolución:** segundo servicio `db-test` en `docker-compose.yml`
(Postgres separado, puerto 5434, base `nutrashot_test`, volumen propio),
`.env.test.example` nuevo (committeado, sólo placeholder de
`DATABASE_URL`), y `vitest.config.ts` ahora carga `.env.test` en vez de
`.env.local`. Documentado en `AGENTS.md`, `quickstart.md` y `plan.md`
(aplicar la migración inicial contra ambas bases). Verificado: con la
base de test caída, `npm test` falla con `ECONNREFUSED` en el puerto
5434 sin tocar la base de dev (puerto 5433 confirmado arriba después de
la corrida); una vez que el usuario levantó `docker compose up -d` y
aplicó la migración a `nutrashot_test`, la suite completa pasó en verde
contra la base nueva.

**Por qué así (no otra alternativa):** se mantuvo el mismo patrón que ya
usa el proyecto (Postgres vía Docker Compose, migraciones SQL planas
aplicadas a mano, sin test-runner de migraciones) en vez de introducir
una herramienta nueva (por ejemplo una base en memoria o un contenedor
efímero por corrida) — coherente con la decisión de `research.md` de no
usar ORM ni infraestructura de testing adicional a la ya elegida.

---

## 2026-08-28 — Deshabilitar el razonamiento extendido del modelo de visión (intento de fix de performance)

**Contexto:** FR-022/SC-001 (p95 ≤10s del análisis de foto) medido en
T059 con throttling Fast 4G real: 8/10 corridas violaron el umbral,
5/10 fallaron directamente (504/500). Imágenes de prueba ≤500KB, así
que la subida de la imagen se descartó como causa principal.

**Hipótesis probada:** el SDK `@google/generative-ai` no fijaba ningún
`generationConfig`, así que el modelo `gemini-3.1-flash-lite` podía estar
usando un presupuesto de "thinking"/razonamiento alto por default,
explicando la latencia.

**Qué se hizo:** se agregó `generationConfig.thinkingConfig.thinkingBudget
= 0` en `lib/ai/vision.ts` (tarea T059b en `tasks.md`), con un tipo
`GenerationConfigConThinking` local porque el SDK `^0.24.1` instalado no
tipa ese campo pero lo pasa igual en el body de la request.

**Resultado — hipótesis descartada:** sin mejora significativa de
latencia en pruebas manuales sueltas; calidad de las estimaciones sin
cambios. Se dejó el cambio igual (config razonable por default, no hace
daño), pero **no resuelve el problema real**. La causa raíz de la
latencia sigue sin identificarse — ver `BACKLOG.md` § Performance para
las hipótesis pendientes de probar (instrumentar tiempos, revisar
cuota/tier de la API key, confirmar el modelo, investigar los 500
intermitentes).

**Commits:** `3cb9bbe` (docs: research/spec/tasks documentando el
intento), `44cfc8c` (perf: el cambio de código en `vision.ts`).
