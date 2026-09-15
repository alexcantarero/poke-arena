# Apéndice para el README — v0.5.0

Este paquete de cambios **no incluye el `README.md` real**: solo trae los ficheros que
cambiaron para la v0.5.0, y el README no es uno de ellos (nadie lo tocó). Esto es lo que
habría que ajustar a mano en el tuyo; son cambios pequeños y puntuales, no una reescritura.

## 1. Número de versión

Donde el README diga `v0.4.0` (portada, o cerca del badge de versión si tienes uno):
cámbialo a **v0.5.0**.

## 2. Novedades recientes (si tienes esa sección)

Si el README tiene un bloque tipo "novedades" o "qué hay de nuevo" que enlaza al
`CHANGELOG.md`, con este texto basta:

> **v0.5.0** — hora y precio del torneo, el mazo también se puede fijar solo por
> arquetipo, cada ronda sabe si es suizo o top cut (y de qué fase), avisos de feedback
> (snackbar) en las acciones de torneo, y dos estadísticas nuevas: cuota de metagame y
> rendimiento por número de ronda. Detalle completo en
> [`CHANGELOG.md`](CHANGELOG.md#050--2026-09-15).

## 3. Si el README documenta los tipos de torneo

Si en algún sitio se listan los tipos de torneo que se pueden elegir al crear uno
(`league_challenge`, `league_cup`, `pokemon_challenge`, `pokemon_cup`, `regional`…), quita
`pokemon_challenge` y `pokemon_cup` de esa lista: ya no se pueden elegir al crear un torneo
nuevo (puntúan igual que League Challenge/Cup, así que sobraban como opción aparte). El
motor de puntos los sigue reconociendo como alias por si algún dato viejo los trae.

## 4. Si el README documenta el modelo de datos por encima

Dos columnas nuevas, si las mencionas:

- `tournaments.start_time` y `tournaments.entry_fee_cents`.
- `matches.archetype_a_id` (tu propio arquetipo, cuando no hay mazo con lista registrada —
  mismo patrón que `opponent_archetype_id`, que ya existía para el rival).

---

Si me subes el `README.md` real la próxima vez, puedo fusionar esto directamente en vez de
dejarte un apéndice para pegar a mano.
