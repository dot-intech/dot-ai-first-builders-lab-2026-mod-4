ALTER TABLE consumos DROP CONSTRAINT consumos_descripcion_check;

ALTER TABLE consumos ADD CONSTRAINT consumos_descripcion_check
  CHECK (char_length(descripcion) >= 1 AND char_length(descripcion) <= 200);
