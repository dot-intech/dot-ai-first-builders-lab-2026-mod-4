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

## Performance — FR-022/SC-001 cumplido (2026-09-04, p95=7.944s bajo Fast 4G; ver redefinición del umbral abajo)

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

**Spike: `config.mediaResolution: LOW` — no baja el p95, se adopta
igual por cuota/costo del free tier (2026-09-03, commit `213da9a`)** —
prueba manual
contra la API real de Gemini (no el benchmark formal de 15 corridas
bajo Fast 4G; script ad hoc, no committeado), 2 fotos reales de comida
(pasta y sopa de fideos), 2 corridas cada una con y sin el flag: los
tokens de imagen bajaron de ~1080 a ~260 (~4x menos, confirma la
reducción documentada por Google), pero la latencia total no mostró
mejora consistente — default: 5567, 5721, 2793, 7031, 2883ms (prom.
~4.8s); LOW: 3697, 4900, 6669, 3845ms (prom. ~4.8s, mismo orden de
magnitud y misma variancia alta). La descripción de ambos platos se
mantuvo igual de detallada y correcta en las 4 corridas con LOW, sin
degradación visible en esta muestra chica. **No baja el p95** —
coherente con lo ya confirmado arriba (el cuello de botella es la
espera de la respuesta del modelo, no el procesamiento de tokens de
imagen), así que no se justificó correr el benchmark formal completo
de 15 corridas para esto. Aun así se adoptó, decisión explícita del
usuario: reduce el consumo de tokens de imagen contra la cuota TPM del
free tier sin costo de precisión medido en esta muestra,
independientemente de si mueve el p95 o no.

**Campos obligatorios de la respuesta reforzados (2026-09-03, commit
`213da9a`)** —
durante el spike de arriba se notó que, con el schema previo
(`required: ["identificado"]` a nivel raíz), el modelo a veces devolvía
`identificado: true` sin `calorias` ni `confianza` (JSON válido, no
disparaba `RespuestaInvalidaError`) — un consumo real se hubiese
guardado con esos datos faltantes, ya que `validarConsumo` no lo
detecta (`undefined < 0` es `false`). `RESPUESTA_SCHEMA` en
`lib/ai/vision.ts` pasó a `anyOf` con dos ramas (identificado, con
`descripcion`/`calorias`/`desglose`/`confianza` todos `required`; no
identificado, sólo `identificado`) en vez de un único `required` a
nivel raíz que dejaba esos campos opcionales incluso cuando
identificado=true. Validado contra la API real: 4/4 corridas con el
nuevo schema (fotos de pasta y sopa de fideos) devolvieron los 4 campos
completos, algo que antes fallaba con frecuencia visible (ver corridas
del spike de instrumentación arriba). Como backstop adicional (el
schema no es 100% infalible, ver nota de structured output abajo),
`parsearRespuesta` ahora también valida en runtime que esos campos
estén presentes cuando identificado=true, y si no lo están reusa el
mismo camino de `RespuestaInvalidaError` + reintento inmediato ya
existente (ver nota de reintento inmediato abajo) en vez de guardar
datos incompletos.

**FR-022/SC-001/RNF-02 redefinidos: el umbral de 10s pasa a asumir
disponibilidad plena de Google AI Studio (2026-09-04)** — en vez de
subir el umbral de 10s a 15s (alternativa evaluada y descartada, ver
abajo), se optó por acotar el alcance del requisito: ya no aplica a
corridas donde Gemini devolvió un error transitorio de sobrecarga
(HTTP 503/429, `STATUS_TRANSITORIOS` en `lib/ai/vision.ts` — la misma
definición que ya usa el reintento automático). Cambio propagado a
`PRD.md` (RNF-02), `spec.md` (FR-022, SC-001) y `plan.md` (Performance
Goals) — decisión y redacción exacta confirmadas por el usuario antes
de aplicarse (gate de PRD/spec, `AGENTS.md` § Backlog). Motivo: una
medición manual de 19 corridas (2026-09-03, sin throttling Fast 4G,
servidor local) tuvo 3 corridas con 503 de Gemini que por sí solas
llevaban el p95 a ~30s; al excluirlas (15 corridas limpias, mismo
criterio que arriba) el p95 bajó a **7.586s** — sugiere que el código
ya cumple el umbral cuando Google no está congestionado. Cero casos de
JSON malformado en las 19 corridas (ver ítem de abajo). **No reemplaza**
el benchmark formal bajo Fast 4G para confirmarlo con rigor — ver ítem
de abajo. La alternativa de subir el umbral a 15s (evaluada
previamente, nota más abajo) queda descartada por esta decisión — no
se persigue en paralelo.

**Benchmark formal bajo Fast 4G con la nueva definición — FR-022/SC-001
se cumple (2026-09-04)** — 10 corridas válidas bajo throttling Fast 4G
real (mismo protocolo que T059), descartando en vivo las corridas con
503/429 transitorio de Gemini (2 descartadas de 12 totales, mismo
criterio que la redefinición de arriba). Corridas válidas (ms): 3341,
3832, 3996, 4744, 5095, 5470, 5641, 6512, 6730, 7944 → **p95 = 7.944s**
(8.268s si se mide el ciclo completo vía el access log de Next.js,
incluyendo el envío de la respuesta) — **por debajo del umbral de
10s**. 0 fallos entre las 10 válidas. 0 casos de JSON malformado en las
12 corridas totales de la sesión (ver ítem de abajo). Con esto,
FR-022/SC-001/RNF-02 queda **cumplido** bajo la definición vigente
(disponibilidad plena de Google AI Studio) — se da por cerrado el tema
de p95, no queda ninguna palanca de código pendiente de probar.

**Evaluar elevar el umbral de FR-022/SC-001 de 10s a 15s — descartado,
se optó por redefinir el alcance en vez de subir el número (ver nota de
arriba, 2026-09-04).** El TTFT (tiempo al primer token) reportado para
la familia de este modelo ronda los 5s sólo de texto — sin contar
subida de imagen bajo Fast 4G, generación del resto de la respuesta, ni
overhead de la app — así que 10s podía ser un umbral poco realista para
este modelo en el tier gratuito. No re-proponer subir a 15s sin
evidencia de que la redefinición de arriba no alcance (ej. si el
benchmark formal del ítem de arriba sigue sin cumplir el umbral incluso
excluyendo corridas con 503/429).

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
  mano). **31 corridas reales monitoreadas en vivo (2026-09-03 y
  2026-09-04, servidor dev local, tras el fix de campos obligatorios de
  arriba)**: 19 corridas el 2026-09-03 (sin throttling) + 12 corridas el
  2026-09-04 durante el benchmark formal bajo Fast 4G (10 válidas + 2
  descartadas por 503, ver nota de arriba) — **0 casos de JSON
  malformado** en las 31 (0 logs de "no es JSON válido" / "JSON
  inválido pese al schema"). No es tráfico de producción — sigue sin
  confirmarse la frecuencia bajo uso real — pero es la muestra más
  grande hasta ahora sin ningún caso, con la app real (no mocks) contra
  la API real de Gemini, incluyendo corridas con 503/429 transitorio de
  Gemini (que no afectan el parseo, sólo la latencia).

**Cuota del free tier confirmada (2026-09-03)** — límites reales del
dashboard de Google AI Studio (`aistudio.google.com/rate-limit`) para
`gemini-3.1-flash-lite`: **15 RPM, 250K TPM (tokens de entrada), 500
RPD**. No se descarta que ráfagas de testing/desarrollo (más de ~1
request cada 4s) pisen el límite de RPM y devuelvan 429 — ya cubierto
por el reintento de fallos transitorios (`STATUS_TRANSITORIOS`, commit
`a73ccc9`, ver nota abajo). Para uso normal de un usuario real (pocas
fotos por día) 500 RPD sobra de margen. No hay evidencia de latencia
adicional impuesta por el free tier en sí — el rate limiting es sobre
cantidad de requests/tokens, no sobre latencia por request. No se
confirmó (ítem cerrado sin ir más allá; no se investigó) diferencia de
latencia entre free tier y paid tier más allá de lo ya documentado en
la nota de investigación de modelos arriba (sin evidencia oficial de
que el paid tier sea más rápido).

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

## Descartado — no re-proponer sin evidencia nueva

**`gemini-3.5-flash` como reemplazo de `gemini-3.1-flash-lite`
(2026-09-03)** — descartado sin correr el benchmark formal (decisión
del usuario). El TTFT ~5x mejor reportado por Artificial Analysis
(ver nota de investigación de modelos, § Performance) no compensa la
cuota del free tier: `gemini-3.5-flash` tiene sólo **20 RPD** vs. las
**500 RPD** de `gemini-3.1-flash-lite` (ver nota de cuota, § Performance)
— 25x menos, insuficiente para uso real con margen de testing. No
re-proponer sin evidencia de que el límite de RPD del free tier haya
cambiado, o sin decidir explícitamente pasar a tier pago.
