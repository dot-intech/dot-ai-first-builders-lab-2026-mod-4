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

## UI (Pico.css)

Pico ya está adoptado (`@picocss/pico/css/pico.min.css` en
`app/layout.tsx`) pero casi todo el markup usa `<div style={{...}}>`
sueltos en vez de los patrones de Pico, lo que da una sensación tosca.
Partido en ítems atómicos, cada uno sin lógica nueva ni tests (son
cambios puramente de markup/clases) — ver conversación 2026-09-04.

- [ ] **Convertir las filas de `HistorialLista.tsx` a tabla o cards con separación.**
  `HistorialLista.tsx:96-109` — hoy son `<li>` con texto plano y
  `justify-content: space-between`, sin separadores ni tratamiento
  visual entre consumos.

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
