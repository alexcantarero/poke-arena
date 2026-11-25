-- v0.135.0 — Ajustes sueltos (clave → valor). El primero: el registro sin
-- invitación. Tabla aparte para que el código funcione aunque esto no se haya
-- aplicado. Idempotente. Aplicar primero en la rama dev de Neon.

CREATE TABLE IF NOT EXISTS ajustes_extra (
  clave text PRIMARY KEY,
  valor text NOT NULL DEFAULT ''
);
