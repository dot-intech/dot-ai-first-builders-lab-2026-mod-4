# UX/Validación de Datos Requirements Checklist: Registro de Consumo Dietario a partir de Foto

**Purpose**: Validar la calidad de los requisitos del cambio "subir el límite de
la descripción de 120 a 200 caracteres" (FR-017, FR-023, FR-024) antes de
implementar.
**Created**: 2026-08-29
**Feature**: [spec.md](../spec.md)

**Note**: Generado por `/speckit-checklist`, alcance acotado a este cambio
puntual (no re-audita el resto del spec).

## Requirement Completeness

- [x] CHK001 - ¿El nuevo límite (200) está definido de forma idéntica para
  descripción generada por el modelo, carga manual y edición manual? [Spec §FR-017, FR-023, FR-024]
- [x] CHK002 - ¿Queda explícito que el límite aplica a nivel de
  persistencia (no sólo de UI)? [Spec §FR-017 remite a data-model.md]

## Requirement Clarity

- [x] CHK003 - ¿El límite de 200 caracteres es un valor numérico exacto, sin
  términos vagos como "breve" sin cuantificar? [Clarity, Spec §FR-017]

## Requirement Consistency

- [x] CHK004 - ¿FR-023 y FR-024 remiten al mismo límite que FR-017 sin
  duplicar un valor distinto? [Consistency, Spec §FR-023, FR-024]

## Non-Functional Requirements

- [ ] CHK005 - ¿Se documenta si el cambio de límite requiere migración de
  base de datos? [Gap — a resolver en data-model.md/research.md, no en spec.md]

## Notes

- Fuera de alcance de este checklist: seguridad y performance (no aplican a
  este cambio, confirmado por el usuario).
- CHK005 se resuelve editando `data-model.md` con la migración
  correspondiente (paso siguiente del flujo), no queda como ambigüedad del
  spec en sí.
