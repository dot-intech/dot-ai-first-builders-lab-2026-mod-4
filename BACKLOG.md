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

## Auth — implementar bypass de QA para magic link (no-prod)

RF-03b/AC-03b/AC-03c (`PRD.md`), FR-003b y Acceptance Scenario 10
(`spec.md`), y research.md §4a ya documentan el diseño: una única
dirección de email de QA, configurada por variable de entorno, obtiene
acceso directo a la aplicación sin recibir un magic link real — sólo
cuando `NODE_ENV` no es `production`. Motivación: hoy cualquier prueba
manual de login con un email distinto al propio falla, porque
`EMAIL_FROM` usa el dominio sandbox de Resend (`resend.dev`), que sólo
entrega a la dirección con la que se creó la cuenta de Resend.

- [ ] Agregar `QA_BYPASS_EMAIL` a `.env.local.example` y
  `.env.test.example` (vacío por default).
- [ ] En `POST /api/auth/magic-link`
  (`app/api/auth/magic-link/route.ts`): si `email === process.env.QA_BYPASS_EMAIL`
  y `process.env.NODE_ENV !== "production"`, generar el token vía
  `emitirMagicLink` (sin duplicar esa lógica) pero saltear
  `enviarMagicLink`; devolver `{ ok: true, redirectTo: <link> }` en vez
  de `{ ok: true }` (contrato ya actualizado en `contracts/api.md`).
- [ ] En `app/login/page.tsx`: si la respuesta trae `redirectTo`,
  navegar directo ahí en vez de mostrar "revisá tu bandeja de entrada".
- [ ] Tests (TDD, rojo→verde) sobre `POST /api/auth/magic-link`: (a) con
  `QA_BYPASS_EMAIL` seteada y `NODE_ENV` no productivo, la respuesta
  trae `redirectTo` y no se invoca `enviarMagicLink`; (b) con
  `NODE_ENV=production`, el mismo email sigue el flujo normal de envío
  de email, incluso con la variable seteada.
- [ ] Actualizar `tasks.md` de `001-registro-consumo-foto` (vía
  `/speckit-converge`, no a mano) con las tareas resultantes antes de
  implementar.

## Descartado — no re-proponer sin evidencia nueva

**`gemini-3.5-flash` como reemplazo de `gemini-3.1-flash-lite`** —
descartado sin correr benchmark, decisión del usuario (2026-09-03):
sólo 20 RPD en el free tier vs. 500 RPD de `gemini-3.1-flash-lite`,
insuficiente para uso real con margen de testing. No re-proponer sin
evidencia de que el límite de RPD cambió, o sin decidir pasar a tier
pago.

**Comprimir/redimensionar más la imagen como fix de latencia** —
descartado (commit `75f9720`, 2026-09-01): implementado y probado, la
variancia del p95 persistió igual — el cuello de botella es la espera
de la respuesta de Gemini, no la subida. No re-proponer como fix de
latencia sin evidencia de que la subida vuelva a ser el limitante.

**Optimizar el código de subida/parseo como fix de latencia** —
descartado (instrumentación, commit `6d34a3d`, 2026-09-01): ambos
pasos son insignificantes (subida 1-4ms, parseo 0ms) frente a la
espera de Gemini, que es ~100% del tiempo total. No re-proponer sin
evidencia de que esto cambió.

**`mediaResolution: LOW` como fix de latencia** — descartado
(2026-09-03, commit `213da9a`): no bajó el p95 en la prueba manual
contra la API real. Se adoptó igual, pero por reducir el consumo de
tokens de imagen contra la cuota del free tier, no por latencia. No
re-proponer como fix de latencia sin evidencia nueva.

**Subir el umbral de FR-022/SC-001 de 10s a 15s** — descartado
(2026-09-04): se optó por redefinir el alcance del requisito en vez de
subir el número (ya no aplica a corridas con error transitorio
503/429 de Gemini — ver `PRD.md` RNF-02, `spec.md` FR-022/SC-001). No
re-proponer subir el umbral sin evidencia de que la redefinición no
alcance.

**JSON malformado como riesgo activo en producción** — cerrado
(2026-09-04): 31 corridas reales contra la API real de Gemini, 0
casos, tras el fix de campos obligatorios (`anyOf` en
`RESPUESTA_SCHEMA`, commit `213da9a`) y structured output (commit
`e39c6ed`). No es tráfico de producción, así que no descarta un caso
raro bajo uso real — el backstop (`RespuestaInvalidaError` +
reintento) sigue cubriendo el caso si igual llegara a ocurrir. No
re-investigar sin un caso reproducido o evidencia de logs reales.
