CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE usuarios (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email                     text NOT NULL UNIQUE,
  created_at                timestamptz NOT NULL DEFAULT now(),
  magic_link_token_hash     text NULL,
  magic_link_expires_at     timestamptz NULL,
  magic_link_used_at        timestamptz NULL,
  session_token_hash        text NULL,
  session_last_activity_at  timestamptz NULL
);

CREATE TABLE consumos (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id            uuid NOT NULL REFERENCES usuarios(id),
  fecha_hora            timestamptz NOT NULL DEFAULT now(),
  descripcion           text NOT NULL CHECK (char_length(descripcion) >= 1 AND char_length(descripcion) <= 120),
  calorias              numeric NOT NULL CHECK (calorias >= 0),
  pct_carbohidratos     smallint NOT NULL CHECK (pct_carbohidratos >= 0 AND pct_carbohidratos <= 100),
  pct_proteinas         smallint NOT NULL CHECK (pct_proteinas >= 0 AND pct_proteinas <= 100),
  pct_grasas            smallint NOT NULL CHECK (pct_grasas >= 0 AND pct_grasas <= 100),
  pct_otros_nutrientes  smallint NOT NULL CHECK (pct_otros_nutrientes >= 0 AND pct_otros_nutrientes <= 100),
  created_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT desglose_suma_100 CHECK (
    pct_carbohidratos + pct_proteinas + pct_grasas + pct_otros_nutrientes = 100
  )
);

CREATE INDEX consumos_usuario_fecha_idx ON consumos (usuario_id, fecha_hora DESC);
