<!--
Sync Impact Report
==================
Version change: TEMPLATE (unratified) → 1.0.0
Rationale: Initial ratification. All template placeholders replaced with concrete
NutraShot principles derived from user-supplied constraints and AGENTS.md.

Modified principles: N/A (initial adoption)
Added sections:
  - I. Test-First (NON-NEGOTIABLE)
  - II. Aislamiento de Lógica de IA
  - III. Cero Invención de Datos
  - IV. Gestión de Secretos
  - V. Disciplina de Alcance (PRD-Bound)
  - Restricciones del Producto y Stack Técnico
  - Flujo de Desarrollo
  - Governance
Removed sections: none (this is the first concrete ratification)

Templates requiring updates:
  - .specify/templates/plan-template.md: ✅ no changes needed — its "Constitution
    Check" section already reads gates dynamically from this file.
  - .specify/templates/spec-template.md: ✅ no changes needed — generic, no
    hardcoded principle names.
  - .specify/templates/tasks-template.md: ✅ no changes needed — generic task
    structure; test-first ordering already matches Principle I.
  - .specify/templates/checklist-template.md: ✅ no changes needed — generic.
  - No command files found under .specify/templates/commands/ (directory does
    not exist in this repo) — nothing to update there.
  - AGENTS.md / CLAUDE.md: ✅ no changes needed — existing "Qué NO hacer" section
    is already consistent with Principles III, IV, V.

Follow-up TODOs: none.
-->

# NutraShot Constitution

## Core Principles

### I. Test-First (NON-NEGOTIABLE)
Todo código de producción se desarrolla siguiendo TDD: el test se escribe primero,
se lo ejecuta y se lo ve fallar (rojo), luego se implementa el mínimo código
necesario para que pase (verde), y recién después se refactoriza manteniendo la
suite en verde. Ninguna implementación se acepta si sus tests fueron escritos
después del código que verifican. El ciclo rojo-verde-refactor es estricto y no
negociable para toda lógica de negocio, endpoints y módulos de integración con IA.
**Rationale**: escribir el test primero obliga a definir el comportamiento
esperado antes de que existan atajos de implementación, y previene regresiones
silenciosas a medida que el sistema crece.

### II. Aislamiento de Lógica de IA
Toda interacción con el modelo de visión (llamadas a Google AI Studio / Gemini,
construcción de prompts, parsing de la respuesta) vive exclusivamente en un
módulo dedicado, separado de la lógica de negocio, las rutas de la API y los
componentes de UI. El resto del sistema consume una interfaz clara de este
módulo y no conoce detalles del proveedor de IA subyacente (nombre del modelo,
formato de la request, SDK usado).
**Rationale**: permite testear la lógica de negocio con dobles de prueba sin
depender del modelo real, y permite cambiar de proveedor o modelo sin tocar el
resto del sistema.

### III. Cero Invención de Datos
El sistema NUNCA genera, estima o completa datos nutricionales que no provengan
directamente de la respuesta del modelo de visión. Si el modelo no identifica un
alimento o no puede estimar un valor, el sistema lo reporta explícitamente (p. ej.
como "no identificado") en lugar de rellenar con valores por defecto, promedios,
interpolaciones o suposiciones inventadas por el propio backend.
**Rationale**: la utilidad del registro dietario depende de que los datos
mostrados reflejen fielmente lo que el modelo observó; una estimación inventada
por el sistema mismo rompe la confianza del usuario y falsea el historial.

### IV. Gestión de Secretos
Ninguna credencial, API key o secreto se escribe en el código fuente ni se
commitea al repositorio. Todas las credenciales — incluida `GOOGLE_AI_API_KEY` —
se definen exclusivamente vía variables de entorno (`.env.local` en desarrollo;
variables de entorno del entorno de despliegue en producción). Ningún archivo de
configuración versionado contiene valores reales de secretos.
**Rationale**: los secretos hardcodeados son una vulnerabilidad de seguridad de
alto impacto y bajo esfuerzo de explotación, y persisten en el historial de git
aun después de ser removidos del HEAD.

### V. Disciplina de Alcance (PRD-Bound)
No se implementa ninguna funcionalidad que no esté descrita en el PRD vigente.
Quedan fuera de alcance sin excepción — hasta que el PRD se actualice
explícitamente — al menos: RBAC, multi-tenant, pagos, metas de calorías,
export/import de datos y borrado de cuenta. Toda necesidad de este tipo de
funcionalidad requiere primero una actualización del PRD, antes de escribir
código.
**Rationale**: mantener el alcance acotado al PRD evita crecimiento no
planificado del producto y preserva la coherencia entre lo especificado y lo
construido.

## Restricciones del Producto y Stack Técnico

- Stack obligatorio: Next.js 15 (App Router, fullstack en un solo proyecto),
  Node.js 20 LTS, npm, PostgreSQL (vía Docker Compose en desarrollo), Vitest
  para tests, y Google AI Studio (modelo `gemini-3.1-flash-lite`) para el
  análisis de imágenes.
- RNF-07 — Cero persistencia de imágenes: ninguna imagen provista por el
  usuario se persiste en el backend bajo ninguna circunstancia, por privacidad.
  Esto aplica a almacenamiento en disco, base de datos, logs, y cualquier cache
  intermedio.
- RF-03 — Autenticación exclusivamente vía magic link enviado por email. No se
  implementa login ni registro por contraseña bajo ninguna circunstancia.
- Las tablas de PostgreSQL en alcance son `usuarios` y `consumos`; cualquier
  esquema adicional requiere que el PRD lo contemple primero.

## Flujo de Desarrollo

- Todo PR debe demostrar el ciclo rojo-verde-refactor: el commit history o la
  descripción del PR deben evidenciar que los tests existían y fallaban antes
  de la implementación correspondiente (Principio I).
- El revisor de código verifica explícitamente, antes de aprobar: (a) que la
  lógica de llamadas al modelo de IA está aislada en su módulo dedicado
  (Principio II); (b) que no hay valores nutricionales o de identificación de
  alimentos inventados fuera de la respuesta del modelo (Principio III); (c)
  que no hay secretos ni credenciales en el diff (Principio IV); (d) que la
  funcionalidad entregada está cubierta por el PRD vigente (Principio V).
- `npm test` (Vitest) debe pasar en verde antes de mergear cualquier PR.

## Governance

Esta constitución prevalece sobre cualquier otra práctica, convención o
preferencia individual dentro del proyecto. Toda enmienda requiere: (1)
documentar el cambio propuesto y su motivación, (2) actualizar el número de
versión siguiendo semver (MAJOR: eliminación o redefinición incompatible de
principios; MINOR: nuevo principio o expansión material de guía existente;
PATCH: aclaraciones o correcciones no semánticas), y (3) propagar el cambio a
los templates y documentación dependientes (`.specify/templates/*`,
`AGENTS.md`, `CLAUDE.md`) en el mismo cambio.

Todo PR y toda revisión de código deben verificar cumplimiento con los
principios de esta constitución antes de aprobarse. Cualquier complejidad o
desviación de un principio debe justificarse explícitamente en la sección
"Complexity Tracking" del plan correspondiente; si no puede justificarse, se
simplifica el diseño en lugar de violar el principio.

**Version**: 1.0.0 | **Ratified**: 2026-08-22 | **Last Amended**: 2026-08-22
