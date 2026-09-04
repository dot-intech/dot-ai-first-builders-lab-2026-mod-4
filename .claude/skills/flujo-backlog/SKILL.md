---
name: flujo-backlog
description: Flujo completo para tomar y cerrar un ítem de BACKLOG.md de NutraShot — gate de PRD/constitución, spec nuevo vs. modificar uno existente, qué comandos de Spec Kit correr según el caso, ítems de investigación/spike, e implementación TDD. Se usa cuando el usuario pide seguir con el backlog, tomar un ítem pendiente, o cerrar uno ya resuelto.
---

# Flujo para tomar un ítem del backlog (NutraShot)

Las mejoras identificadas fuera del alcance de una spec cerrada viven en
`BACKLOG.md` — sólo ítems abiertos o parcialmente resueltos.

Cuando se cierra un ítem (código implementado, tests en verde — ver paso
4 abajo, nunca antes), **se saca de `BACKLOG.md` directamente, sin
archivarlo en ningún otro lado** — no se deja tildado `[X]`. Su registro
completo ya vive en el/los commit(s) y en `tasks.md`; no se duplica en
prosa aparte (se probó tener un archivo de histórico separado y no
valía el costo de mantenerlo sincronizado con la realidad del código).

Una hipótesis probada y descartada (spike, intento que no funcionó) NO
se saca del backlog: queda como nota corta dentro del ítem abierto al
que aplica ("ya se probó X, se descartó, ver commit `abc123`"), para no
volver a proponerla sin evidencia nueva. Si no hay ningún ítem abierto al
que colgarla (ej. hallazgos de análisis que se decidió no resolver),
usar la sección "## Descartado — no re-proponer sin evidencia nueva" al
final de `BACKLOG.md`.

## 0. Gate de documentos rectores (obligatorio, antes de tocar cualquier spec)
`PRD.md` y la constitución (`.specify/memory/constitution.md`) mandan
sobre cualquier spec. Antes de escribir una línea de spec:
- Si el ítem **contradice o excede** algo que el PRD ya declara (un RF,
  un AC, algo listado en "Fuera de Alcance") o entra en tensión con un
  principio de la constitución: **frenar y confirmar explícitamente con
  el usuario** si corresponde ir en esa dirección, antes de seguir.
- **Nunca decidir en solitario** modificar `PRD.md`, `constitution.md` o
  `AGENTS.md` como efecto colateral de resolver una tarea — son
  decisiones exclusivas del usuario, siempre a confirmar antes de
  tocarlas.

## 1. ¿Modificar un spec existente, o crear uno nuevo?
- **Corrige/refina un requisito que un spec ya declara** (ej. subir un
  límite, ajustar un umbral, un fix dentro de un flujo ya especificado)
  → modificar ese `spec.md` a mano, con el mismo rigor que aplicaría
  `/speckit-specify` (FRs testeables, sin detalles de implementación).
  **Nunca invocar `/speckit-specify` sobre una carpeta existente** — pisa
  `spec.md` con el template en blanco, sin importar el directorio que se
  le pase.
- **Introduce una capacidad que ningún spec declara hoy** → spec nueva
  (`specs/NNN-nombre/`), pipeline completo desde `/speckit-specify`.

## 2. Pipeline de Spec Kit, según el caso
- **Spec nueva**: `/speckit-specify` → `/speckit-clarify` →
  `/speckit-checklist` → `/speckit-plan` → `/speckit-tasks` →
  `/speckit-analyze`.
- **Modificar un spec existente**: editar `spec.md` a mano →
  `/speckit-clarify` → `/speckit-checklist` (**saltar ambos** si el
  cambio es un amend trivial: un solo valor/parámetro dentro de un FR ya
  testeable, sin comportamiento nuevo ni ambigüedad plausible sobre su
  alcance — ej. subir un umbral numérico) → editar a mano
  `research.md`/`data-model.md`/`contracts/`/`quickstart.md`/`plan.md`
  (**nunca correr `/speckit-plan`** sobre un plan existente — regenera
  todo desde cero y borra el razonamiento ya documentado) →
  `/speckit-analyze` → **`/speckit-converge`** para agregar sólo las
  tareas nuevas al final de `tasks.md` (**nunca `/speckit-tasks`**, que
  también regenera `tasks.md` entero y borraría el historial de tareas
  ya cerradas).
- `/speckit-analyze` y `/speckit-converge` son pasos mecánicos, sin
  interacción con el usuario — correrlos como subagente en background
  (no inline), para no cargar su prompt de instrucciones completo ni las
  lecturas intermedias en el contexto de la sesión principal.
  `/speckit-clarify`, la resolución interactiva de `/speckit-checklist`,
  el gate del paso 0, la implementación de código y los mensajes de
  commit se quedan en el modelo principal.

## 3. Ítems de investigación/spike
Ítems sin comportamiento observable de usuario (ej. "instrumentar
tiempos para encontrar la causa de la latencia") quedan **fuera** de
este flujo: se resuelven directo y el resultado — funcione o no — se
documenta al cerrarse como nota corta en el ítem abierto de `BACKLOG.md`
al que aplica, o en § Descartado si no hay ítem abierto al que colgarlo
(ver ejemplos ahí, ej. "mediaResolution: LOW como fix de latencia").
Si un spike concluye en un cambio de comportamiento observable, ese
cambio sí entra al flujo de arriba (paso 1). Ojo: esta nota corta es
sólo para el *resultado* del spike (funcionó / se descartó) — no para
narrar la implementación ya commiteada de un ítem que sí se resolvió;
ver el ejemplo ❌/✅ en `AGENTS.md` § Backlog.

## 4. Implementación
Siempre TDD (rojo → verde), como en la feature 001. Ver también
`AGENTS.md` § "Principios de implementación" (cambio mínimo
indispensable, no duplicar lógica nueva) y § "Commits" (unidad de
commit, split diseño/implementación, confirmación explícita antes de
`git commit`/`git push`) — esas dos secciones aplican a cualquier
cambio de código, no sólo a los que pasan por este flujo, así que
siguen en `AGENTS.md` en vez de acá.

## 5. Antes de dar un ítem por cerrado
Releer el párrafo que va a quedar (o no) en `BACKLOG.md` y confirmar:
¿describe una tarea ya hecha, o una hipótesis que se probó y se
descartó? Sólo el segundo caso se queda, y como nota corta (2-4
líneas, no un párrafo largo) — ver el ejemplo ❌/✅ en `AGENTS.md` §
Backlog. Si describe una tarea resuelta (aunque sea "para dejar
contexto"), se saca del todo: su registro ya vive en el commit y en
`tasks.md`, no se archiva aparte.
