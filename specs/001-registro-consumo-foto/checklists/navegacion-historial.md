# Checklist: Navegación de vuelta al tablero desde Historial

**Purpose**: Validar la calidad del nuevo requisito FR-034b antes de tocar plan/tasks
**Created**: 2026-08-28
**Feature**: [spec.md](../spec.md)

## Requirement Completeness

- [x] CHK001 - ¿Está especificado dónde debe aparecer la opción de volver al tablero dentro de la pantalla de Historial? [Completeness, Spec §FR-034b] — Resuelto: visible sin scroll adicional, posición exacta a criterio de implementación.
- [x] CHK002 - ¿Está definido si esta opción de navegación aplica sólo a Historial o también a otras pantallas fuera del tablero? [Completeness, Spec §FR-034b] — Resuelto: alcance limitado a Historial, a propósito (el resto de las pantallas ya redirige al tablero vía FR-035/AC-38).

## Requirement Clarity

- [x] CHK003 - ¿Es "opción visible" lo suficientemente específico para diferenciarla de otras opciones ya existentes en la UI (Nuevo, Cerrar Sesión)? [Clarity, Spec §FR-034b] — Resuelto: es una acción semánticamente distinta, no requiere texto literal fijado en el spec.

## Requirement Consistency

- [x] CHK004 - ¿Es consistente FR-034b con FR-011 (opciones del tablero) en cuanto a qué elementos de navegación expone cada pantalla? [Consistency, Spec §FR-011, §FR-034b] — Resuelto: sin conflicto, son pantallas distintas con sus propias acciones.

## Edge Case Coverage

- [x] CHK005 - ¿Se aclara si la navegación de vuelta debe preservar o no el estado de scroll/filtro del historial? [Edge Case, Gap] — N/A: Historial no tiene filtros ni estado de scroll persistente hoy.
