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

## UX

- [ ] **Layout no responsivo en la pantalla de revisión de consumo
  (RNF-05).** `RevisionConsumo.tsx:74` fija `width: 320` en el
  `<article>` y `app/nuevo/page.tsx:42` fija `padding: 48` en el
  `<main>` — ninguno de los dos escala con el viewport. Con esos anchos
  fijos, el grid de 4 columnas del desglose nutricional
  (`RevisionConsumo.tsx:123-136`) queda con columnas de ~70-80px,
  insuficientes para etiquetas como "carbohidratos" u
  "otrosNutrientes", que se parten letra por letra y tapan el valor del
  input (el `value` en sí está bien seteado). RNF-05 exige responsive
  entre 240p y 4K pero no fija un breakpoint en px concreto — no hay un
  ancho a "sacar" del PRD. Fix: reemplazar los px fijos por unidades
  fluidas (`width: 100%` + `max-width` razonable, padding en `rem`/el
  `.container` de Pico), usando 320px como piso mínimo de viewport a
  soportar — no como ancho fijo de componente, sino como estándar de
  facto mobile-first (dispositivo real más angosto en uso) — y agregar
  un breakpoint al grid del desglose para bajar a 2 columnas en
  viewports angostos en vez de forzar 4 parejas siempre. De paso,
  evaluar si el `rows={3}` fijo del textarea de descripción
  (`RevisionConsumo.tsx:98`) amerita ajuste una vez resuelto el ancho —
  hoy fuerza scroll interno que tapa contenido. Al resolver el
  breakpoint, asegurar además un touch target cómodo (~44px de alto)
  en los 4 inputs de macro para mobile — hoy quedan muy chicos como
  para tocarlos con el dedo.

- [ ] **Etiquetas del desglose nutricional sin formatear en
  `RevisionConsumo.tsx`.** El grid de inputs (`RevisionConsumo.tsx:126`)
  muestra la key cruda del objeto (`carbohidratos`, `proteinas`,
  `grasas`, `otrosNutrientes` en camelCase sin espacio) en vez de una
  etiqueta legible. `DonaNutricional.tsx:10-15` ya tiene el mapeo
  humanizado (`"Carbohidratos"`, `"Otros nutrientes"`, etc.) para las
  mismas claves — extraerlo a un lugar compartido (p.ej. un mapa de
  labels en `lib/consumos/nutricion.ts`) y usarlo desde ambos
  componentes en vez de tener las etiquetas crudas en uno y las lindas
  en el otro. De paso, agrupar los 4 inputs en un
  `<fieldset><legend>Desglose nutricional</legend>` — hoy no hay ningún
  heading ni agrupamiento semántico que indique que son un solo bloque
  relacionado (afecta también a lectores de pantalla) — e indicar la
  unidad (%) en cada label, ya que hoy no hay ningún indicio visual de
  que el valor sea un porcentaje y no gramos.

- [ ] **Pulido visual de inputs, imagen y textarea en
  `RevisionConsumo.tsx`.** Tres detalles de estilado puntuales, sin
  cambio de estructura ni de lógica: (1) los inputs del desglose
  nutricional tienen un contraste de borde muy bajo contra el fondo
  oscuro — casi no se distinguen como campos editables; (2) la
  miniatura de la foto cargada (`RevisionConsumo.tsx:78-83`, 160×160)
  no tiene `border-radius`/borde/sombra — queda flotando sin marco; (3)
  el grip de resize nativo del `<textarea>` de descripción
  (`RevisionConsumo.tsx:98-107`) contrasta visualmente con el resto de
  los inputs Pico-styled — evaluar `resize: vertical` con más `rows`
  por defecto, o sacar el resize y dejarlo crecer automático.

- [ ] **Destacar visualmente el aviso de estimación inexacta.** El
  párrafo "Esta estimación puede ser inexacta — revisala antes de
  guardar." (`RevisionConsumo.tsx:75`) es el mensaje más importante de
  toda la pantalla — le pide al usuario que revise antes de confiar en
  los datos — pero hoy pesa visualmente igual que cualquier texto de
  párrafo. Agregar un ícono (⚠️) y/o un fondo sutil que lo diferencie,
  usando tokens de Pico ya disponibles (no un color nuevo fuera de
  paleta).

- [ ] **Preview en vivo de la dona nutricional en el formulario de
  revisión.** Hoy `RevisionConsumo.tsx` sólo muestra los 4 inputs de
  macro en crudo, sin ningún feedback visual de si suman 100% mientras
  se editan. `DonaNutricional.tsx` ya existe y se usa en el tablero —
  reusarlo acá (pasándole `calorias`/`desglose` del estado local) para
  dar feedback inmediato en vez de construir un indicador nuevo.

- [ ] **Salida accesible sin bajar hasta el final del formulario de
  revisión.** Hoy "Cancelar" está sólo al pie de `RevisionConsumo.tsx`
  (línea 144), después de foto + descripción + calorías + desglose. En
  mobile, con teclado abierto buena parte del tiempo, es una salida
  incómoda. Agregar una forma de cancelar/salir también cerca del
  `<h1>` de `app/nuevo/page.tsx`, no sólo al pie.

- [ ] **Revisar el peso/tono tipográfico del `<h1>` de "Nuevo
  consumo".** Prioridad baja, es una cuestión de tono más que
  funcional: el peso/tamaño del `<h1>` (default de Pico + Geist en
  `app/nuevo/page.tsx:43`) es muy asertivo/decorativo para un título de
  formulario utilitario, contrasta con el tono clínico del resto de la
  pantalla. Evaluar un peso menor o reservar el peso fuerte para datos
  (como el número de calorías) en vez del título de página.

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
