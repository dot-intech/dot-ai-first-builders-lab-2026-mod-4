# Backlog de mejoras — NutraShot

Mejoras identificadas pero fuera del alcance de `tasks.md` de
`001-registro-consumo-foto` (ya cerrada). No implementar sin antes
decidir con el usuario si ameritan actualizar el PRD/spec o si se
tratan como deuda técnica suelta.

Un ítem cerrado se saca del todo — su registro completo ya vive en el
commit y en `tasks.md`, no se archiva aparte. Una hipótesis probada y
descartada (spike, intento fallido) queda como nota corta dentro del
ítem abierto al que aplica, o en § Descartado si no hay ningún ítem
abierto al que colgarla. Ver `AGENTS.md` § Backlog.

## Performance — FR-022/SC-001 no se cumple (p95 real: 11.83s vs. umbral 10s)

Medido originalmente en T059 (`specs/001-registro-consumo-foto/tasks.md`)
con throttling Fast 4G real: 8/10 corridas violaron el umbral de 10s, 5/10
fallaron directamente (504/500), p95 = 31.56s. Las imágenes de prueba
pesaban ≤500KB, así que **la subida de la imagen no es la causa
principal** — descartada la hipótesis inicial de tamaño de imagen sin
comprimir. `thinkingBudget = 0` (SDK legacy, commits `3cb9bbe`/`44cfc8c`)
se probó y se descartó: sin mejora significativa de latencia.

**Re-verificación formal bajo Fast 4G (2026-09-01, 15 corridas, mismo
protocolo de T059)** tras migrar a `thinkingLevel: ThinkingLevel.MINIMAL`
y al SDK `@google/genai` (commits `4d5f512`/`79047d2`): 7.84, 8.60, 8.65,
8.81, 9.07, 9.35, 9.67, 10.01, 10.05, 10.10, 10.74, 10.98, 11.66,
2.75(❌500), 11.83(❌500) → **p95 = 11.83s** (calculando igual que T059,
por rango más cercano sobre las 15 corridas incluyendo errores; excluyendo
las 2 con error, p95 sobre las 13 OK = 11.66s — misma conclusión). Mejora
marcada frente al baseline (p95 31.56s → ~11.8s, fallos 5/10 → 2/15), pero
**FR-022/SC-001 sigue sin cumplirse** — 11.83s > 10s. Sigue sin poder
atribuirse la mejora a un cambio puntual (`thinkingLevel` vs. migración de
SDK) sin un experimento que aisle cada uno.

- [ ] **Bajar el p95 de ~11.8s a menos de 10s.** Con la causa raíz de la
  latencia todavía sin identificar (ver ítem de instrumentación abajo),
  no hay una hipótesis concreta de qué tocar para cerrar esta brecha.

- [ ] **Investigar la causa raíz real de la latencia.** Instrumentar
  `app/api/consumos/analizar/route.ts` y `lib/ai/vision.ts` con logs de
  tiempo (marca de tiempo antes/después de `model.generateContent`) para
  aislar cuánto del tiempo total es: (a) subida cliente→server, (b)
  espera de la respuesta de Gemini, (c) parseo. Con imágenes de 500KB,
  todo indica que el cuello de botella está en (b) — la llamada a Gemini
  en sí — no en la red del cliente. `thinkingBudget=0` se había descartado
  como causa, pero la mejora informal observada con `thinkingLevel:
  MINIMAL` (ítem de arriba) deja esto otra vez en duda — instrumentar
  antes de asumir nada sobre el "thinking".
- [ ] **Revisar si la clave de `GOOGLE_AI_API_KEY` tiene límites de
  cuota/tier gratuito** que impongan latencia adicional o
  rate-limiting silencioso en Google AI Studio.
- [ ] **Confirmar que `gemini-3.1-flash-lite` es realmente el modelo
  usado y que no hay una alternativa de menor latencia** disponible en
  Google AI Studio para este caso de uso.
- [ ] **Investigar los errores 500 intermitentes** (~2/10 corridas en
  T059, 2/15 el 2026-09-01) — hipótesis original: `JSON.parse` falla
  sobre la respuesta del modelo (cortada o envuelta en texto adicional
  pese al prompt). Pero **`app/api/consumos/analizar/route.ts` no tiene
  ningún catch genérico** alrededor de `analizarImagen()` (sólo captura
  `TimeoutAnalisisError`) — cualquier error no-timeout, incluido un 503
  "overloaded" de Gemini sin reintentar, sube sin manejar y Next.js lo
  convierte en el mismo 500 genérico. Es decir, el 500 intermitente
  podría ser JSON malformado, 503 de Gemini, o ambos indistintamente; hoy
  no se puede saber cuál sin loguear. Reprodujo de nuevo el 2026-09-01
  (corridas 9 y 10 del benchmark de p95 bajo Fast 4G) pero sin captura
  del log — `npm run dev` corría interactivo en la terminal del usuario,
  sin archivo de log, y no se guardó el output a tiempo. El logging
  agregado en `lib/ai/vision.ts` (commit `06aa0ff`) ya deja la traza real
  en consola — la próxima vez que se reproduzca, **redirigir `npm run
  dev` a un archivo** (o revisar la terminal en el momento) para poder
  leerla. Se resolverá junto con el catch genérico + logging discriminado
  cuando se encare el ítem de reintento con backoff de abajo.
- [ ] **Revisar si el timeout de 30s en `route.ts` (`TIMEOUT_ANALISIS_MS`)
  es la estrategia correcta** — hoy sólo envuelve la llamada a Gemini,
  no la subida completa, y 30s es varias veces el umbral de 10s de
  FR-022; una vez resuelta la causa raíz, decidir si conviene bajarlo
  para fallar más rápido y reintentar (ver ítem de reintentos abajo).
- [ ] **Agregar reintento automático con backoff** ante fallos
  transitorios de la llamada a Gemini (distinto del reintento de
  guardado de FR-024a, que es para el guardado en DB, no para el
  análisis de imagen).

## UX

- [ ] **Evaluar si `HistorialLista.tsx` puede mostrar datos desactualizados
  tras restaurarse desde el back-forward cache (bfcache) del navegador.**
  Mismo mecanismo que se arregló en `TableroResumen.tsx` (commit
  `789a4d7`, 2026-08-30): si el usuario borra o agrega un
  consumo y después usa el botón "atrás" del navegador para volver a
  `/historial` desde una página que quedó bfcached, podría ver la lista
  vieja. Caso más acotado que el del tablero — requiere específicamente
  el botón atrás, no el flujo normal hacia adelante — y el spec no exige
  actualización instantánea en Historial (a diferencia de FR-012 para el
  tablero), por eso queda como ítem a evaluar, no como bug confirmado.

## Otras mejoras propuestas (menor prioridad / no relacionadas a performance)

- [ ] **Comprimir/redimensionar la imagen en el cliente antes de
  subirla** (Canvas API: `createImageBitmap` + `canvas.toBlob`, máximo
  ~1280px en el lado más largo, calidad JPEG ~0.85) en
  `components/CapturaImagen.tsx`. Propuesta original pensada como fix
  de performance — **descartada como causa raíz en este caso** (las
  imágenes de prueba pesaban ≤500KB), pero sigue siendo una mejora
  defensiva válida para cuando un usuario suba fotos pesadas desde una
  cámara de alta resolución o sin comprimir. Es una operación
  transitoria en memoria del navegador — no viola RNF-07 (cero
  persistencia de imágenes).
