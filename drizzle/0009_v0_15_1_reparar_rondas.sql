-- =========================================================================
-- Arena v0.15.1 — reparar las rondas de torneo que se «convirtieron» en
-- partida interna al editarlas.
--
-- QUÉ PASÓ
-- --------
-- Hasta la v0.15.0, el «Editar» de una ronda abría el formulario de partida
-- genérico. Si allí se elegía como rival a alguien del grupo, la ronda se
-- guardaba con `player_b_id` relleno: dejaba de ser una ronda del torneo (las
-- rondas tienen `player_b_id` nulo), desaparecía de la ficha y salía como
-- «Amistoso suelto». Es lo que le pasó a la R3 de Alex contra Ibai en el
-- League Challenge Monstercards.
--
-- QUÉ HACE ESTO
-- -------------
-- Devuelve al formato de ronda las partidas que:
--   · tienen torneo, número de ronda y rival del grupo (`player_b_id`),
--   · NO tienen competición (si tienen, son de liga y se dejan),
--   · y cuyo jugador A todavía no tiene otra fila en esa misma ronda.
-- El rival pasa a `opponent_player_id` (y su nombre a `opponent_name`), y
-- `player_b_id` vuelve a nulo. No se borra nada.
--
-- Pega primero el SELECT para ver qué filas tocaría. Si son las que esperas,
-- lanza el UPDATE. Es idempotente: una segunda vez no encuentra nada.
-- =========================================================================

-- 1) Vista previa
SELECT m.id, t.name AS torneo, m.round, pa.name AS jugador, pb.name AS rival, m.date
  FROM matches m
  JOIN tournaments t ON t.id = m.tournament_id
  JOIN players pa ON pa.id = m.player_a_id
  JOIN players pb ON pb.id = m.player_b_id
 WHERE m.tournament_id IS NOT NULL
   AND m.player_b_id IS NOT NULL
   AND m.competition_id IS NULL
   AND m.round > 0
   AND NOT EXISTS (
     SELECT 1 FROM matches x
      WHERE x.tournament_id = m.tournament_id
        AND x.player_a_id = m.player_a_id
        AND x.round = m.round
        AND x.player_b_id IS NULL);

-- 2) Reparación
UPDATE matches m
   SET opponent_player_id = m.player_b_id,
       opponent_name = COALESCE(NULLIF(m.opponent_name, ''), pb.name),
       player_b_id = NULL
  FROM players pb
 WHERE pb.id = m.player_b_id
   AND m.tournament_id IS NOT NULL
   AND m.competition_id IS NULL
   AND m.round > 0
   AND NOT EXISTS (
     SELECT 1 FROM matches x
      WHERE x.tournament_id = m.tournament_id
        AND x.player_a_id = m.player_a_id
        AND x.round = m.round
        AND x.player_b_id IS NULL);
