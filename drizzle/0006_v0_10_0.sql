-- =========================================================================
-- Arena v0.10.0 — fecha de corte del Elo y adiós a TCG Live.
--
-- Pégalo entero en el SQL Editor de Neon. Es idempotente salvo el DROP del
-- final, que solo puede hacerse una vez (y por eso lleva IF EXISTS).
--
-- `npm run db:push` hace lo mismo leyendo el esquema de Drizzle, pero para el
-- borrado de la tabla te va a pedir confirmación por consola. Si prefieres no
-- responder preguntas a ciegas, usa este fichero.
-- =========================================================================

-- ----------------------------------------------------------------- ajustes
-- Desde cuándo cuenta el Elo. Nula = desde el principio.
--
-- Es la forma de «reiniciar» el Elo sin borrar nada: el Elo no está guardado
-- en ninguna parte, se recalcula desde las partidas en cada carga. Poner una
-- fecha aquí hace que todos vuelvan al Elo inicial y se reconstruya desde
-- ahí. Quitarla lo devuelve todo, porque las partidas siguen donde estaban.
ALTER TABLE settings ADD COLUMN IF NOT EXISTS elo_since date;

-- ------------------------------------------------------- Pokémon TCG Live
-- Fuera. TCG Live no tiene forma de exportar el historial de partidas —ni
-- API, ni descarga— así que todo lo que se podía hacer era teclearlo a mano,
-- y eso no lo va a hacer nadie dos semanas seguidas. La funcionalidad se
-- retira entera en la v0.10.0.
--
-- Si habías importado algo y quieres conservarlo, sácalo ANTES de lanzar
-- esto:
--
--   SELECT * FROM ptcg_live_matches ORDER BY date;
--
-- El DROP es irreversible.
DROP TABLE IF EXISTS ptcg_live_matches;

-- ------------------------------------------------------------ comprobación
--   SELECT elo_since FROM settings WHERE id = 'default';
--   SELECT to_regclass('ptcg_live_matches');   -- tiene que devolver NULL
