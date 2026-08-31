# Requirements Checklist: Duración de sesión (8h → 24h)

**Purpose**: Validar que el amend de RNF-06/FR-006 (duración de sesión de 8
a 24 horas) quede consistente y completo en todos los documentos que
declaran o dependen de ese valor, antes de propagarlo a diseño y código.
**Created**: 2026-08-31
**Feature**: [spec.md](../spec.md) §FR-006, [PRD.md](../../../PRD.md) §RNF-06/AC-36

**Note**: Generado por `/speckit-checklist` como parte del amend de spec
para este ítem (no una spec nueva). Foco acotado al cambio puntual, no un
checklist genérico de toda la feature.

## Requirement Consistency

- [x] CHK001 ¿El valor de expiración de sesión es el mismo en PRD.md (RNF-06,
  AC-36) y spec.md (FR-006, escenario 6, edge case)? [Consistency, Spec
  §FR-006] — sí, ambos en 24h tras este amend.
- [x] CHK002 ¿El valor de expiración de sesión referenciado en plan.md,
  data-model.md, research.md y quickstart.md coincide con el de spec.md?
  [Consistency, Gap] — resuelto, los cuatro actualizados a 24h.

## Requirement Clarity

- [x] CHK003 ¿Está claro si la expiración es por ventana deslizante
  (se resetea con actividad) o por tiempo absoluto desde el login? [Clarity,
  Spec §FR-006] — sí, "tras N horas de inactividad" es inequívocamente
  ventana deslizante, sin cambios por este amend.

## Acceptance Criteria Quality

- [x] CHK004 ¿AC-36 sigue siendo objetivamente verificable (dado/cuando/
  entonces con un umbral numérico) tras el cambio de valor? [Measurability,
  PRD §AC-36] — sí, sigue siendo un umbral numérico único, sólo cambió el
  número.

## Dependencies & Assumptions

- [x] CHK005 ¿El valor de `INACTIVIDAD_MAX_MS` en código y los casos de
  prueba que lo ejercitan quedan como la única fuente de verdad, sin
  valores de "8 horas" hardcodeados en otro lugar del código/tests?
  [Traceability, Gap] — resuelto (T077-T081). Nota: ni `/speckit-analyze`
  ni `/speckit-converge` (Haiku) detectaron `tests/integration/
  auth-dashboard.test.ts`, que también tenía "8h" hardcodeado — se
  encontró recién al correr `npm test` tras T079 y ver un tercer archivo
  fallar. Este checklist había marcado el riesgo correctamente; el gap
  estaba en la herramienta automática, no en el checklist.

## Notes

- Checklist acotado a este amend puntual (subir de 8 a 24 horas), no
  re-audita toda la calidad de FR-006 desde cero.
- CHK002 y CHK005 quedan abiertos a propósito — son justamente los
  siguientes pasos del flujo (actualizar research.md/data-model.md/
  quickstart.md/plan.md a mano, y luego la implementación con TDD).
