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

## Performance — FR-022/SC-001 no se cumple (p95 real: 31.56s vs. umbral 10s)

Medido en T059 (`specs/001-registro-consumo-foto/tasks.md`) con throttling
Fast 4G real: 8/10 corridas violaron el umbral de 10s, 5/10 fallaron
directamente (504/500). Las imágenes de prueba pesaban ≤500KB, así que
**la subida de la imagen no es la causa principal** — descartada la
hipótesis inicial de tamaño de imagen sin comprimir. `thinkingBudget = 0`
(SDK legacy, commits `3cb9bbe`/`44cfc8c`) se probó y se descartó: sin
mejora significativa de latencia.

- [ ] **Re-verificar el p95 bajo Fast 4G con el protocolo de T059 (10
  corridas) ahora que se migró a `thinkingLevel: ThinkingLevel.MINIMAL`
  (SDK vigente, commit `4d5f512`).** Señal informal positiva el
  2026-08-31: 4 corridas en red normal (sin throttling, no comparable
  1:1 con T059), 3/4 debajo de 10s, 0 fallos — mejora marcada respecto al
  8/10 violaron el umbral y 5/10 fallaron del benchmark original. Pero
  `MINIMAL` ya era el default del modelo según la documentación de
  Gemini, así que no había expectativa de que este cambio mejorara nada
  — la mejora observada es sorpresiva y no está explicada; podría deberse
  también a la migración de SDK en sí (`@google/generative-ai` →
  `@google/genai`, commit `79047d2`) y no al dial de thinking. No dar por
  cumplido FR-022/SC-001 sin repetir el benchmark formal bajo Fast 4G.

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
- [ ] **Investigar los errores 500 intermitentes** (`JSON.parse` falla
  sobre la respuesta del modelo, ~2/10 corridas) — ver si el modelo
  está devolviendo la respuesta cortada, envuelta en texto adicional
  pese al prompt, o si es un problema del SDK. El logging agregado en
  `lib/ai/vision.ts` (commit `06aa0ff`) ya deja la traza real en
  consola — revisarla la próxima vez que se reproduzca.
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

- [ ] **Adoptar Pico.css para mejorar el look and feel general de la
  UI.** Hoy todos los estilos son inline por componente (`style={{...}}`,
  ver por ejemplo `CapturaImagen.tsx`), sin ningún framework — los
  campos editables, botones, etc. se ven toscos y sin consistencia.
  Pico.css es "classless": estiliza directo las etiquetas semánticas
  (`<button>`, `<input>`, `<label>`, etc.) sin requerir agregar clases
  propias en el JSX, así que es una integración rápida (sólo importar
  el CSS) y de bajo riesgo — si más adelante no convence, se puede
  sacar y migrar a algo con más control (por ejemplo Tailwind CSS) sin
  una reescritura grande, ya que no deja clases de framework acopladas
  al markup (salvo el uso puntual de alguna clase opcional de Pico,
  como `.outline` o `.grid`, si se llegara a usar).

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
