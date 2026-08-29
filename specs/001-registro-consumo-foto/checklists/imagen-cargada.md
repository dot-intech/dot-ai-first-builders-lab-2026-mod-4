# Checklist: Mostrar la imagen cargada durante el análisis y la revisión

**Purpose**: Validar la calidad del nuevo requisito FR-019a (y escenarios
1a, 6a, 7a) antes de tocar plan/tasks
**Created**: 2026-08-29
**Feature**: [spec.md](../spec.md)

## Requirement Completeness

- [x] CHK001 - ¿Está definido si el usuario puede ampliar/hacer zoom sobre la imagen mostrada, o sólo se exhibe en tamaño fijo? [Completeness, Gap] — Resuelto: tamaño fijo (thumbnail), sin zoom ni lightbox.
- [x] CHK002 - ¿Está especificado qué pasa si la imagen provista no puede previsualizarse en el cliente (por ejemplo, un archivo cuyo tipo el navegador no puede decodificar), aunque el análisis en el servidor sí haya funcionado? [Completeness, Gap] — N/A: FR-015a ya valida formato (JPEG/PNG/WebP) y tamaño antes de aceptar la imagen, por lo que el navegador siempre puede decodificarla para previsualizarla.

## Requirement Clarity

- [x] CHK003 - ¿Es "la imagen que cargó" (FR-019a) suficientemente específico en cuanto al tamaño/resolución con que se muestra, o queda deliberadamente a criterio de implementación? [Clarity, Spec §FR-019a] — Resuelto: a criterio de implementación (thumbnail de tamaño fijo, ver CHK001), no requiere valores exactos en el spec.

## Requirement Consistency

- [x] CHK004 - ¿Es FR-019a consistente con FR-031 (cero persistencia de imágenes) en cuanto a que la visualización es puramente del lado del cliente? [Consistency, Spec §FR-019a, §FR-031] — Resuelto: sin conflicto, FR-019a lo declara explícitamente.
- [x] CHK005 - ¿Es consistente el alcance de FR-019a (procesamiento, revisión de estimación, y carga manual tras error) con los tres momentos definidos en los escenarios 1a, 6a y 7a? [Consistency, Spec §FR-019a] — Resuelto: los tres escenarios cubren exactamente los tres momentos declarados en FR-019a.

## Edge Case Coverage

- [x] CHK006 - ¿Se aclara qué imagen se muestra si el usuario usa "Cargar otra imagen" (FR-028) tras una estimación de baja confianza — se reemplaza inmediatamente la mostrada por la nueva selección, o convive con la anterior? [Edge Case, Gap] — Resuelto: se reemplaza; vuelve al paso de captura y sólo se muestra la nueva selección una vez cargada.

## Non-Functional Requirements

- [x] CHK007 - ¿Están definidos requisitos de accesibilidad (texto alternativo) para la imagen mostrada, en línea con la decisión ya tomada de no exigir un estándar de accesibilidad formal en esta versión? [Coverage, Spec §Clarifications 2026-08-22] — N/A: ya resuelto a nivel de feature (Session 2026-08-22) que no hay requisito formal de accesibilidad en esta versión; no amerita una excepción puntual para esta imagen.
