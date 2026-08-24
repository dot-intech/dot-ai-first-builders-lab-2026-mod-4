# General Requirements Quality Checklist: Registro de Consumo Dietario a partir de Foto

**Purpose**: Sanity check estándar de la calidad de los requisitos del spec completo, para el propio autor antes de pasar a `/speckit-plan`.
**Created**: 2026-08-22
**Feature**: [spec.md](../spec.md)

**Note**: Este checklist evalúa la calidad de los requisitos (completitud, claridad, consistencia, cobertura), no el comportamiento del sistema implementado.

## Requirement Completeness

- [x] CHK001 - ¿Está definido si se crea automáticamente un registro de `Usuario` la primera vez que alguien solicita un magic link, o si requiere un alta previa? [Gap, Spec §Key Entities] — Resuelto: alta automática. Agregado FR-003a y escenario US1.8.
- [x] CHK002 - ¿Está especificado el estado del tablero (gráfico de dona) cuando el usuario no tiene ningún consumo cargado en el día? [Gap, Spec §US1] — Resuelto: dona y valores en cero. Agregado escenario US1.9.
- [x] CHK003 - ¿Está especificado el estado del historial cuando el usuario no tiene ningún consumo cargado? [Gap, Spec §US4] — Resuelto: mensaje explícito de estado vacío. Agregado escenario US4.4.
- [x] CHK004 - ¿Está definido si el valor de "porción" (serving size), mencionado en la sección Objetivos del PRD, es un dato requerido junto con las calorías, o si queda fuera de alcance de esta spec? [Gap, Spec §Requirements] — Resuelto: el PRD estaba mal (RF/Objetivos mencionaban "porciones" sin necesidad); se corrigió `PRD.md` para eliminar esa mención. La porción sigue siendo mencionable dentro de la descripción amigable (p. ej. "una pechuga", "un vaso"), pero no es un campo estructurado obligatorio.
- [x] CHK005 - ¿Está documentado cuánto tiempo se retienen los consumos de un usuario, dado que no existe función de borrado de cuenta ni export/import? [Gap, Spec §Assumptions] — Resuelto: retención indefinida mientras la cuenta exista. Agregado a Assumptions.
- [x] CHK006 - ¿Están definidos requisitos para el caso en que falla el guardado en base de datos después de que el usuario ya confirmó el consumo (p. ej. corte de red)? [Gap, Recovery Flow] — Resuelto: mostrar error y permitir reintentar sin perder los datos revisados/editados. Agregado escenario US2.11 y edge case.
- [x] CHK007 - ¿Está especificado qué ocurre si el modelo de visión devuelve una descripción en un idioma distinto al Español (Latinoamérica) exigido por FR-036? [Gap, Spec §FR-036] — Resuelto: se garantiza vía prompt al modelo (responsabilidad del módulo de IA), sin fallback de traducción. Agregado a Assumptions.

## Requirement Clarity

- [x] CHK008 - ¿Está cuantificado qué significa "descripción amigable" de los alimentos identificados, más allá de "no vacía"? [Clarity, Spec §FR-017] — Resuelto: debe ser breve y concisa, sin prosa extensa. FR-017 actualizado.
- [x] CHK009 - ¿Especifica el spec si existe algún límite de longitud o formato para la descripción y calorías editadas manualmente por el usuario (FR-023, FR-024)? [Clarity, Spec §FR-024] — Resuelto: sin límite de longitud explícito; las calorías deben ser un número no negativo. FR-024 actualizado.
- [x] CHK010 - ¿Está definido si "nivel de confianza" (RNF-03 / FR-027) es un único valor agregado por imagen o un valor por cada alimento identificado dentro de la misma imagen? [Ambiguity, Spec §FR-027] — Resuelto: un único valor agregado por imagen/análisis. FR-027 actualizado.
- [x] CHK011 - ¿Es medible objetivamente el criterio "el usuario puede ubicar cualquier consumo propio... sin necesidad de un buscador" (SC-005)? [Measurability, Spec §SC-005] — Resuelto: se acepta como medible tal cual está; sin cambios.

## Requirement Consistency

- [x] CHK012 - ¿Es consistente la regla de invalidación de magic links (FR-004a) con el resto de las reglas de expiración/uso único descriptas en FR-004 y RNF-01? [Consistency, Spec §FR-004a] — Resuelto: son reglas independientes y compatibles; sin cambios.
- [x] CHK013 - ¿Es consistente la exigencia de que el desglose nutricional generado por el sistema sume 100% (FR-010) con el flujo de edición manual del desglose por el usuario (FR-024), o el spec deja abierto si esa misma regla de suma=100% aplica también a un desglose editado a mano? [Consistency, Spec §FR-010, §FR-024] — Resuelto: la regla de suma=100% aplica también a la edición manual. FR-024 actualizado.
- [x] CHK014 - ¿Permite el flujo de carga manual ante error de procesamiento (FR-023) que el consumo se guarde sin desglose nutricional, y si es así, es esto consistente con FR-010/FR-014 que exigen que el desglose siempre esté presente? [Conflict, Spec §FR-023] — Resuelto: la carga manual también exige completar el desglose nutricional sumando 100%. FR-023 actualizado.

## Acceptance Criteria Quality

- [x] CHK015 - ¿Tiene cada requisito funcional (FR-001 a FR-036 más FR-004a/FR-015a) al menos un escenario de aceptación asociado en alguna User Story? [Traceability, Spec §Requirements] — Resuelto: verificado, sin huérfanos; sin cambios.
- [x] CHK016 - ¿Existe un esquema de identificación único y estable para los escenarios de aceptación dentro de cada User Story (hoy son sólo números 1, 2, 3 por historia, sin ID global)? [Traceability, Gap] — Resuelto: no hace falta un ID global adicional; el PRD ya aporta esa trazabilidad (AC-01..AC-38). Sin cambios.

## Scenario Coverage

- [x] CHK017 - ¿Cubre el spec el escenario de un usuario con sesión activa que solicita un nuevo magic link (además de uno sin sesión)? [Coverage, Gap, Spec §US1] — Resuelto: ya cubierto por FR-004a; no requiere un requisito adicional. Sin cambios.
- [x] CHK018 - ¿Está cubierto el escenario de un usuario que intenta cargar dos consumos casi simultáneos a partir de la misma imagen (posible duplicado)? [Coverage, Gap, Spec §US2] — Resuelto: decisión deliberada de no detectar duplicados. Agregado a Assumptions y a Edge Cases.
- [x] CHK019 - ¿Están definidos requisitos para el caso en que el usuario pierde conectividad a mitad del análisis de la imagen (distinto de "tarda más de 30s")? [Coverage, Gap, Spec §FR-021] — Resuelto: cubierto por el manejo de error genérico existente (FR-021/FR-023); sin cambios.

## Edge Case Coverage

- [x] CHK020 - ¿Está definido qué ocurre si el usuario deniega el permiso de cámara/galería más de una vez, o revoca el permiso después de haberlo concedido? [Edge Case, Spec §Edge Cases] — Resuelto: mismo comportamiento en todos los casos, ya cubierto; sin cambios.
- [x] CHK021 - ¿Está definido el comportamiento cuando la imagen es rechazada por formato/tamaño (FR-015a) dentro del flujo de "Cancelar en cualquier paso" (FR-030)? [Edge Case, Spec §FR-015a, §FR-030] — Resuelto: ya cubierto por el alcance de FR-030 ("cualquier paso"); sin cambios.
- [x] CHK022 - ¿Está definido si el indicador de "estimación de baja confianza" (FR-027) permanece visible en el consumo ya guardado y visible desde el Historial, o sólo se muestra durante la carga? [Gap, Spec §Key Entities] — Resuelto: es transitorio, sólo guía la edición antes de guardar; no se conserva ni se muestra después. Key Entities y US4 actualizados.

## Non-Functional Requirements

- [x] CHK023 - ¿Está documentada la decisión de no aplicar rate limiting sobre solicitudes de magic link ni sobre análisis de imagen como una decisión deliberada y no como una omisión? [Clarity, Spec §Clarifications] — Resuelto: ya estaba documentado en Clarifications/Assumptions; sin cambios.
- [x] CHK024 - ¿Está especificado el nivel de accesibilidad exigido (o explícitamente no exigido) para esta versión? [Clarity, Spec §Assumptions] — Resuelto: ya estaba documentado en Assumptions; sin cambios.
- [x] CHK025 - ¿Están cuantificados los límites de formato y tamaño de imagen aceptados (FR-015a) de forma consistente con el resto de los requisitos de carga de imagen? [Consistency, Spec §FR-015a] — Resuelto: consistente, sin conflictos; sin cambios.

## Dependencies & Assumptions

- [x] CHK026 - ¿Está validada (o al menos señalada como riesgo) la asunción de que el modelo de visión siempre devuelve un formato del que se puede extraer confianza, descripción, calorías y desglose? [Assumption, Spec §Assumptions] — Resuelto: ya está correctamente señalada como asunción; sin cambios.
- [x] CHK027 - ¿Está señalada como asunción, y no como requisito garantizado, la disponibilidad de un proveedor de email transaccional confiable para los magic links? [Assumption, Spec §Assumptions] — Resuelto: ya está correctamente señalada; sin cambios.
- [x] CHK028 - ¿Está documentada la asunción sobre qué zona horaria se usa para agrupar el historial por semana/mes/año? [Assumption, Spec §Assumptions] — Resuelto: ya está documentada; sin cambios.

## Ambiguities & Conflicts

- [x] CHK029 - ¿Queda claro si un consumo guardado puede editarse después desde el Historial, o si edición sólo es posible antes de guardar (User Story 2) y el Historial sólo permite eliminar (User Story 5)? [Ambiguity, Spec §US5] — Resuelto: un consumo guardado no puede editarse, sólo eliminarse. Agregado FR-034a y escenario US4.5.
- [x] CHK030 - ¿Es consistente el uso del término "consumo" a lo largo de todo el spec sin sinónimos alternativos ("registro", "entrada", "comida") que puedan confundir la implementación? [Consistency, Spec §Key Entities] — Resuelto: verificado, uso consistente; sin cambios.

## Notes

- Checklist general de calidad de requisitos (profundidad estándar, para uso del autor antes de `/speckit-plan`).
- Resuelto punto por punto el 2026-08-24 junto con el usuario. Las decisiones que implicaron cambios de contenido quedaron integradas en `spec.md` (sección `Clarifications` → `Session 2026-08-24`) y, en el caso de CHK004, también en `PRD.md`.
- Check items off as completed: `[x]`
