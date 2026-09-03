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

**Compresión/redimensionado de imagen en cliente implementada
(2026-09-01, commit `75f9720`)** — `lib/imagen/comprimir.ts` +
`components/CapturaImagen.tsx`, máximo 1280px en el lado mayor, calidad
JPEG 0.85. Prueba manual inmediatamente después (3 corridas, sin
throttling Fast 4G): 500 a los 20.5s, luego 200 a los 4.8s, luego 200 a
los 27.2s. **La variancia persiste igual de alta con la imagen ya
comprimida** — confirma que la causa raíz no es el tamaño de la subida
(ya se sabía desde el baseline) y que el cuello de botella sigue estando
en la espera de la respuesta de Gemini. No se corrió el benchmark
formal de 15 corridas bajo Fast 4G con este cambio — se decidió que la
evidencia manual ya alcanza para descartar la subida como causa y no
justifica el costo de repetir el protocolo completo.

**Instrumentación de tiempos (2026-09-01, commit `6d34a3d`)** — se
agregaron logs de `performance.now()` en
`app/api/consumos/analizar/route.ts` (tiempo de
`request.formData()`, o sea lectura del body ya recibido) y
`lib/ai/vision.ts` (tiempo de `generateContent` y de `parsearRespuesta`).
5 corridas locales (sin throttling Fast 4G, servidor y cliente en el
mismo host — esto **no** mide la subida real por red lenta, sólo el
overhead de lectura del body ya en el server) con una imagen sintética:
`gemini` = 14343, 14360, 1876, 1061, 23106ms; `parseo` = 0ms en las 4
corridas que llegaron a parsear (la 2ª tiró 503 de Gemini antes); `subida`
(lectura del body) = 1-4ms en las 5. **Confirma la sospecha ya
documentada arriba: la espera de la respuesta de Gemini es
prácticamente el 100% del tiempo total** — el parseo del JSON es
insignificante y la lectura del body en el server también, aunque este
último dato no reemplaza al benchmark formal bajo Fast 4G para medir la
subida real por red (eso sigue siendo overhead de transferencia, no de
procesamiento). No hay margen de optimización en el código de la app
para esta brecha — cualquier mejora depende de la latencia del modelo
en sí (ver ítems de tier/modelo abajo) o de aceptar el umbral de 15s.

**Investigación de modelos/config alternativos (2026-09-02)** —
investigación de fuentes públicas (sin tocar código), para responder si
`gemini-3.1-flash-lite` es realmente la opción de menor latencia
disponible en Google AI Studio para este caso de uso. Conclusión: hay
un candidato razonable para probar, no un fix garantizado.
[Artificial Analysis — Gemini 3.5 Flash (minimal) vs Gemini 3.1
Flash-Lite](https://artificialanalysis.ai/models/comparisons/gemini-3-5-flash-minimal-vs-gemini-3-1-flash-lite-preview)
(benchmarks sobre la API real de Google, release de `gemini-3.5-flash`
19/05/2026): TTFT de `gemini-3.5-flash` con `thinkingLevel: MINIMAL` =
0.92s vs. 5.22s de `gemini-3.1-flash-lite` (~5x mejor); output algo más
lento una vez arrancado (186 tok/s vs. 283 tok/s). El sucesor directo
`gemini-3.5-flash-lite` **no** es mejor — [TTFT 7.60s, peor que el
modelo actual](https://artificialanalysis.ai/models/gemini-3-5-flash-lite) —
"lite" no predice menor latencia en esta familia. Contra de
`gemini-3.5-flash`: ~6x más caro por token de output ($9.00 vs. $1.50
/1M), aunque en tier gratuito de AI Studio (uso de desarrollo, sin
billing) el costo no aplica. La [documentación oficial de rate
limits](https://ai.google.dev/gemini-api/docs/rate-limits) no publica
cifras concretas por modelo ni diferencias de latencia entre tier
gratis y pago. Hallazgo más relevante: un [hilo del foro oficial de
Google AI Developers (mayo
2026)](https://discuss.ai.google.dev/t/gemini-3-1-flash-lite-is-very-slow-and-inconsistent/143754)
reporta el mismo patrón que este proyecto (mismo prompt, thinking
mínimo, latencia 0.6s-20.3s en ~25% de las corridas vía API, rápido y
consistente en el playground) sin causa raíz confirmada por Google —
corrobora que la variancia medida acá es un problema conocido del
modelo/infraestructura de Google, no de la implementación de
NutraShot. Además existe
[`config.mediaResolution`](https://ai.google.dev/gemini-api/docs/generate-content/media-resolution)
en el SDK `@google/genai` (`LOW`/`MEDIUM`/`HIGH`/`ULTRA_HIGH`, default
`UNSPECIFIED`): `LOW` reduce los tokens con que el modelo procesa la
imagen → "faster processing and lower cost, but with less detail"
(cita textual de la doc) — mecanismo distinto de comprimir el archivo
antes de subir (ya descartado sin mejora), actúa sobre el
procesamiento interno del modelo, no sobre el tamaño transmitido.
Streaming (`generateContentStream`) se descartó como palanca: reduciría
el TTFT percibido pero no el tiempo hasta tener el JSON completo
parseable, y requeriría rediseñar el frontend para progreso parcial —
cambio de alcance mayor, no una config puntual.

- [ ] **Bajar el p95 de ~11.8s a menos de 10s.** Con la instrumentación
  de arriba confirmando que casi el 100% del tiempo es la espera de la
  respuesta de Gemini (no subida, no parseo), no queda margen de
  optimización en el código de la app — la única palanca real es cambiar
  de modelo/tier (ver ítems abajo) o, si eso no rinde, evaluar el ítem
  de subir el umbral a 15s.
- [ ] **Evaluar elevar el umbral de FR-022/SC-001 de 10s a 15s.** El TTFT
  (tiempo al primer token) reportado para la familia de este modelo ronda
  los 5s sólo de texto — sin contar subida de imagen bajo Fast 4G,
  generación del resto de la respuesta, ni overhead de la app — así que
  10s podría ser un umbral poco realista para este modelo en el tier
  gratuito, más que un problema de implementación. No hay evidencia de
  que el free tier en sí sea más lento que el pago (hay reportes del foro
  oficial de casos donde el tier pago fue más lento por congestión), así
  que no se plantea esto como fix de tier sino como posible ajuste de
  expectativa. La compresión/redimensionado de imagen en cliente ya se
  implementó (ver nota arriba) y la evidencia manual indica que **no**
  bajó la variancia del p95 — el bloqueo que impedía evaluar este ítem ya
  no aplica, pero sigue sin decidirse porque falta el benchmark formal de
  15 corridas bajo Fast 4G con el cambio aplicado para tener un número
  comparable al de arriba. Si se decide subir el umbral, es un cambio de
  FR-022/SC-001 y pasa por el gate de PRD/spec (`AGENTS.md` § Backlog),
  no un ajuste suelto de código.

- [ ] **Revisar si la clave de `GOOGLE_AI_API_KEY` tiene límites de
  cuota/tier gratuito** que impongan latencia adicional o
  rate-limiting silencioso en Google AI Studio.
- [ ] **Spike: probar `gemini-3.5-flash` con `thinkingLevel: LOW` o
  `MINIMAL` explícito** en vez de `gemini-3.1-flash-lite` (ver nota de
  investigación arriba) — correr el benchmark formal de 15 corridas bajo
  Fast 4G (mismo protocolo de T059) para confirmar si el TTFT ~5x mejor
  reportado por Artificial Analysis se traduce en un p95 real más bajo
  en este proyecto, y evaluar el impacto en costo (~6x más caro por
  token de output; irrelevante mientras se use tier gratuito de AI
  Studio) y en precisión de identificación antes de adoptarlo.
- [ ] **Spike: probar `config.mediaResolution: LOW`** en la llamada a
  `generateContent` de `lib/ai/vision.ts` (ver nota de investigación
  arriba) — medir impacto en latencia y, por separado, en la precisión
  de identificación de alimentos/calorías (trade-off documentado por
  Google, no gratis).
- [ ] **Confirmar si además hay casos reales de JSON malformado** en la
  respuesta de Gemini (hipótesis original de los 500 intermitentes,
  sólo se confirmó la instancia puntual de 503 — ver nota de manejo de
  errores arriba). El reintento con backoff no cubre este caso: sólo
  reintenta fallos transitorios de la llamada (`ApiError` con status
  503/429), no un `JSON.parse` que falla sobre una respuesta ya
  recibida. **Instrumentación agregada (2026-09-02, commit `40527e8`)**
  — `RespuestaInvalidaError` en `lib/ai/vision.ts` distingue este caso
  con su propio log tanto ahí como en `route.ts`; sigue pendiente
  revisar logs de uso real para saber si ocurre y con qué frecuencia
  (no se puede confirmar sin tráfico real o un caso reproducido a
  mano).
**Structured output migrado (2026-09-02, commit `e39c6ed`)** — se
agregó `responseMimeType: "application/json"` + `responseSchema` a
`GENERATION_CONFIG` en `lib/ai/vision.ts`, restringiendo el sampling de
tokens del modelo a la forma esperada en vez de depender sólo de la
instrucción de formato del prompt. Validado contra la API real de
Gemini (además del test que confirma los params enviados): la
respuesta vino sin markdown ni texto extra, y parseó sin error. No es
100% infalible (puede truncarse por límite de tokens, o fallar por un
error de API) — de ahí el reintento inmediato de abajo como backstop.

**Reintento inmediato como backstop (2026-09-03, commit
`b51951c`)** — ante `RespuestaInvalidaError` (JSON malformado pese al
schema), `analizarImagen` reintenta la llamada completa a Gemini una
vez, sin backoff (a diferencia del reintento por fallos transitorios de
red, acá no hay motivo estadístico para esperar). Si el segundo intento
también falla el parseo, se propaga `RespuestaInvalidaError` como
antes. El timeout de 30s (`TIMEOUT_ANALISIS_MS`) sigue envolviendo todo
el análisis (ver nota de manejo de errores abajo), así que este
reintento adicional no necesita presupuesto propio.

**Manejo de errores, timeout y reintento (commit `a73ccc9`)** — se
agregó reintento automático (1 reintento, backoff fijo de 1s) en
`lib/ai/vision.ts` ante fallos transitorios de la llamada a Gemini
(`ApiError` con status 503 o 429), y un catch genérico en
`app/api/consumos/analizar/route.ts` que devuelve un 500 explícito con
mensaje genérico en vez de dejar subir la excepción sin manejar (que
Next.js convertía en un 500 sin cuerpo estructurado). El timeout de 30s
(`TIMEOUT_ANALISIS_MS`, FR-021) se revisó y se decidió **no** bajarlo:
sigue envolviendo el análisis completo (incluido el reintento interno),
así que un fallo transitorio que persiste dos intentos igual cae dentro
del mismo presupuesto de 30s sin necesitar un timeout más corto para
"fallar rápido y reintentar" — el reintento ya vive adentro del
timeout existente.
