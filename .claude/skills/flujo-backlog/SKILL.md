---
name: flujo-backlog
description: Flujo completo para tomar y cerrar un ítem de BACKLOG.md de NutraShot — gate de PRD/constitución, spec nuevo vs. modificar uno existente, qué comandos de Spec Kit correr según el caso, ítems de investigación/spike, e implementación TDD. Se usa cuando el usuario pide seguir con el backlog, tomar un ítem pendiente, o cerrar uno ya resuelto.
---

# Flujo para tomar un ítem del backlog (NutraShot)

Las mejoras identificadas fuera del alcance de una spec cerrada viven en
dos archivos:
- `BACKLOG.md` — ítems abiertos, pendientes de hacer.
- `BACKLOG-HISTORICO.md` — decisiones de proyecto que no viven en ningún
  otro documento (ni en el `spec.md`/`research.md` de una feature
  puntual, ni en la constitución), con fecha, la decisión tomada, y el
  motivo si no es obvio (incluye intentos descartados, no sólo los que
  funcionaron).

Cuando se cierra un ítem, **se saca de `BACKLOG.md` y se agrega como
entrada nueva en `BACKLOG-HISTORICO.md`** (más reciente arriba) — no se
deja tildado `[X]` en `BACKLOG.md`. El objetivo es que `BACKLOG.md`
siempre muestre sólo lo pendiente, y que el historial de decisiones quede
consultable aparte. Un ítem se cierra recién cuando el código está
implementado y sus tests pasan (ver paso 4 abajo) — nunca antes.

Cada entrada de `BACKLOG-HISTORICO.md` va **resumida**: la decisión y el
motivo (si no es obvio), no el paso a paso — el detalle narrativo (qué
se tocó, en qué orden) ya vive en el mensaje del/los commit(s)
referenciados, no hace falta duplicarlo acá. Cerrar con un puntero a
esos commits.

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
  `/speckit-clarify` → `/speckit-checklist` → editar a mano
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
documenta al cerrarse en `BACKLOG-HISTORICO.md` (ver ejemplo del intento
de `thinkingBudget=0`). Si un spike concluye en un cambio de
comportamiento observable, ese cambio sí entra al flujo de arriba (paso 1).

## 4. Implementación
Siempre TDD (rojo → verde), como en la feature 001. Ver también
`AGENTS.md` § "Principios de implementación" (cambio mínimo
indispensable, no duplicar lógica nueva) y § "Commits" (unidad de
commit, split diseño/implementación, confirmación explícita antes de
`git commit`/`git push`) — esas dos secciones aplican a cualquier
cambio de código, no sólo a los que pasan por este flujo, así que
siguen en `AGENTS.md` en vez de acá.
