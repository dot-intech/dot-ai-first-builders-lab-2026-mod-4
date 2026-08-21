---
name: conventional-commit
description: genera un comentario de commit que sea corto, claro y consistente con las buenas prácticas del "conventional commit", además de explicar brevemente los cambios que se hicieron en el commit. Se usa cuando el usuario quiere hacer un commit, para proponer al usuario el comentario a asociar al commit.
---

# Conventional Commit

Miras los cambios que se van a commitear con "git diff", y según los mismos y los archivos que se modificaron generas un comentario que explica los cambios que se hicieron, de manera breve, clara y consistente con las buenas prácticas del "conventional commit". El comentario debe seguir la siguiente estructura obligatoriamente: tipo(scope): descripción en imperativo. Además, el comentario debe seguir estos lineamientos:
- El tipo dice qué clase de cambio es: feat (feature nueva), fix (arreglo), docs (documentación), refactor, test, chore (mantenimiento).
- El scope (opcional) dice qué parte del proyecto toca.
- La descripción: en imperativo, minúscula, sin punto final, corta (≤ 72 caracteres).

## El template del comentario (estructura obligatoria)

tipo(scope): descripción en imperativo

### Ejemplos
feat(auth): agregar validación de email en la generación del magic link
fix(ux/ui): arreglar bug al subir foto (no cargaba la foto)
docs(prd): modificar el RNF de nivel de confianza de la estimación, por testing
