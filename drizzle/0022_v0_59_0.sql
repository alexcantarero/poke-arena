-- v0.59.0 — comentarios en las listas de los mazos. Idempotente.
ALTER TABLE decks ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT '';
