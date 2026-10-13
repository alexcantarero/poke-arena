# 04 · Modelo de datos

Doce tablas en PostgreSQL. El esquema vive en **`src/db/schema.ts`** y es la única fuente de
verdad: `npm run db:push` lo aplica a Neon `dev` configurada en `.env.local`; los cambios de
producción requieren una migración revisada y aprobada por una persona.

---

## Cómo encaja todo

```
                      ┌───────────────┐
                      │   settings    │  una sola fila, id = "default"
                      └───────────────┘

  ┌─────────┐        ┌──────────────┐        ┌──────────────┐
  │ players │───────<│    decks     │>───────│  archetypes  │
  └─────────┘        └──────────────┘        └──────────────┘
    │ │ │ │                  │                Pokémon principal
    │ │ │ │                  │                + secundario
    │ │ │ │
    │ │ │ │           ┌──────────────┐
    │ │ │ └──────────<│   matches    │>─── deck_a_id / deck_b_id
    │ │ │             └──────────────┘      opponent_archetype_id
    │ │ │                    │
    │ │ │             ┌──────────────┐
    │ │ │             │    games     │  un registro por juego de la serie
    │ │ │             └──────────────┘
    │ │ │
    │ │ │             ┌──────────────────────┐      ┌───────────────┐
    │ │ └────────────<│ competition_players  │>─────│ competitions  │
    │ │               └──────────────────────┘      └───────────────┘
    │ │                                                     │
    │ │               ┌──────────────────────┐      ┌───────────────┐
    │ └──────────────<│  tournament_results  │>─────│  tournaments  │
    │                 └──────────────────────┘      └───────────────┘
    │                  único (torneo, jugador)              │
    │                                              ┌───────────────┐
    │                 ┌──────────────┐             │    events     │
    └────────────────<│   invites    │             └───────────────┘
                      └──────────────┘             apunta a los dos
                       created_by
```

Tres ideas centrales:

1. **Un `match` es la serie completa; un `game` es cada juego de dentro.** Así un Bo3 que
   acaba 2–1 son un `match` y tres `games`. El marcador nunca se guarda: se deriva contando los
   juegos, y por eso no puede quedar desfasado.
2. **El `archetype` es la unidad de las estadísticas, no el `deck`.** Cada jugador tiene su
   mazo con su nombre y su lista, pero si dos llevan Dragapult, los dos apuntan al mismo
   arquetipo y suman a la misma casilla de la matriz de emparejamientos.
3. **`competitions` y `tournaments` son cosas distintas, y por eso son tablas distintas.** Una
   *competición* la organizáis vosotros y se juega entre vosotros: genera emparejamientos y da
   puntos de liga. Un *torneo* es un evento de fuera —una League Cup, uno de tienda, uno online—
   al que va alguien del grupo: no genera emparejamientos, y lo que se guarda es el resultado de
   cada uno y los Championship Points que se llevó.

---

## `settings` — configuración de la liga

Una sola fila, con `id = "default"`.

| Columna | Tipo | Qué es |
|---|---|---|
| `id` | text (PK) | Siempre `"default"` |
| `name` | text | Nombre de la liga |
| `season` | text | Temporada, se ve bajo el logo |
| `cp_season` | integer | Temporada de Play! Pokémon en curso para los CP: 2027, 2028… |
| `pts_win` / `pts_tie` / `pts_loss` | integer | Puntuación (3 / 1 / 0 por defecto) |
| `elo_start` | integer | Elo de partida (1000) |
| `elo_k` | integer | Factor K del Elo (24) |
| `rating_zone` | text | Zona del ranking oficial: `europe`, `us-canada`, `latam`, `oceania`, `mesa` |
| `registration_open` | boolean | Si está a `false`, los enlaces de invitación dejan de admitir altas |
| `updated_at` | timestamptz | Última modificación |

> Nada de esto se guarda "calculado" en ninguna otra tabla. Cambiar `pts_win` recalcula la
> clasificación entera en la siguiente carga de página.

---

## `players` — jugadores, que también son cuentas

No hay tabla de usuarios aparte: **un jugador es una cuenta**. La aplicación sirve a una sola
liga, así que separarlas sería estructura sin uso. El día que sirva a varias, esta tabla se parte
en `users` + `league_members` y el resto del esquema no se entera.

| Columna | Tipo | Qué es |
|---|---|---|
| `id` | text (PK) | Generado por la app (`p-lx8f2k3a1b`) |
| `name` | text | Nombre visible |
| `email` | text (nullable) | En minúsculas y sin espacios. Índice único `players_email_idx` |
| `password_hash` | text (nullable) | scrypt, en formato `"salt:hash"` hexadecimal. Nunca la contraseña en claro |
| `role` | text | `owner` · `admin` · `player` |
| `active` | boolean | Si cuenta en el ranking y aparece en los desplegables |
| `color` | text | Color del avatar (`#f0b429`) |
| `avatar_kind` | text | `none` (la inicial) · `pokemon` · `image` |
| `avatar_value` | text | Slug del Pokémon, o URL `https://` de la imagen, según `avatar_kind` |
| `bio` | text | Una frase, hasta 280 caracteres |
| `favorite_archetype_id` | text (nullable) | Mazo favorito, para la ficha |
| `player_tag` | text (nullable) | Nombre de jugador en Play! Pokémon, para casar resultados oficiales |
| `joined` | date | Fecha de alta |
| `last_seen_at` | timestamptz (nullable) | Se actualiza al entrar |
| `created_at` | timestamptz | |

**Los tres papeles.** `player` registra lo suyo: sus mazos, sus partidas, sus torneos y su
perfil. `admin` gestiona además la liga entera: invitaciones, competiciones, calendario,
ajustes y las cosas de los demás. `owner` es un `admin` que además puede repartir y quitar el
papel de `owner`. La liga nunca se puede quedar sin ningún `owner` activo: las acciones que
degradan o desactivan lo comprueban antes.

> **`email` y `password_hash` no salen nunca del servidor.** Las páginas cargan los jugadores
> con la proyección `PUBLIC_PLAYER_COLUMNS` de `src/lib/data.ts`, que deja esas dos columnas
> fuera. El motivo está en la [guía de desarrollo](07-guia-de-desarrollo.md#dos-reglas-de-seguridad-que-no-se-negocian);
> resumido: lo que un Server Component pasa a un componente cliente acaba escrito en el HTML.

> **Por qué `active` y no borrar.** Un jugador con partidas, mazos o resultados de torneo no se
> puede borrar sin dejar el historial huérfano. `deletePlayer()` en `src/actions/index.ts` mira
> si tiene alguna de las tres cosas: si las tiene, lo desactiva; si no, lo borra de verdad.

---

## `invites` — enlaces de alta

La liga es cerrada, y esto es lo que la cierra: no hay registro abierto, solo enlaces. El token
es la parte secreta de la URL `/registro/<token>` — 24 bytes aleatorios en base64url, imposibles
de adivinar.

| Columna | Tipo | Qué es |
|---|---|---|
| `token` | text (PK) | La parte secreta del enlace |
| `label` | text | Etiqueta libre: "Javi", "el grupo de los martes" |
| `role` | text | Papel con el que entra quien la use: `player` o `admin` |
| `max_uses` | integer | Cuántas altas admite. **0 = sin límite** |
| `uses` | integer | Cuántas lleva |
| `expires_at` | timestamptz (nullable) | Nulo = no caduca |
| `revoked` | boolean | Anulada a mano desde *Ajustes* |
| `created_by` | text (nullable) → `players.id` | `ON DELETE SET NULL` |
| `created_at` | timestamptz | |

Una invitación vale si no está anulada, no ha caducado y le quedan usos: eso es exactamente lo
que comprueba `inviteState()` en `src/lib/auth.ts`.

> **El uso se consume con un `UPDATE` condicional, antes de crear el jugador.** Es una sola
> sentencia, así que la base de datos serializa las carreras: dos personas abriendo a la vez el
> mismo enlace de un uso no entran las dos. Si después falla el alta, el uso se devuelve.

---

## `archetypes` — arquetipos de mazo

| Columna | Tipo | Qué es |
|---|---|---|
| `id` | text (PK) | |
| `name` | text | Nombre visible: "Dragapult ex", "Ogerpon Box" |
| `main` | text | Slug del Pokémon principal: `dragapult`, `excadrill-mega` |
| `secondary` | text | Slug del secundario, o cadena vacía |
| `type` | text | Tipo de energía, solo para colorear: `grass`, `fire`, … |
| `limitless_id` | text (nullable) | Identificador equivalente en Limitless, si se sincronizó |

Los slugs siguen la convención de Limitless, porque son los que forman la URL del sprite. La
función `pokeSlug()` de `src/lib/pokemon.ts` normaliza lo que escribe la gente:

| Escribes | Se guarda |
|---|---|
| `Mega Excadrill ex` | `excadrill-mega` |
| `N's Zoroark ex` | `zoroark` |
| `Ogerpon Wellspring ex` | `ogerpon-wellspring` |
| `Raging Bolt ex` | `raging-bolt` |

---

## `decks` — mazos

| Columna | Tipo | Qué es |
|---|---|---|
| `id` | text (PK) | |
| `player_id` | text → `players.id` | `ON DELETE CASCADE` |
| `archetype_id` | text → `archetypes.id` | |
| `name` | text | Nombre libre del mazo |
| `list` | text | La lista tal cual se pegó |
| `list_json` | jsonb (nullable) | La lista ya interpretada |
| `format` | text | `standard` por defecto |
| `retired` | boolean | Mazo aparcado: deja de ofrecerse en los desplegables, pero sus partidas siguen contando |
| `created` | date | |

`list_json` guarda el resultado de `parseDeckList()`:

```json
{
  "total": 60,
  "pokemon": [{ "n": 3, "name": "Dragapult ex", "set": "TWM", "number": "130" }],
  "trainer": [{ "n": 4, "name": "Arven", "set": "OBF", "number": "186" }],
  "energy":  [{ "n": 9, "name": "Basic {P} Energy", "set": "SVE", "number": "13" }],
  "errors": []
}
```

> Se guardan **las dos**: el texto original y la versión interpretada. El texto porque es lo
> que la gente reconoce y quiere volver a copiar; la interpretada porque es sobre la que se
> puede consultar sin volver a parsear. Si algún día mejoras el parser, puedes reprocesar todo
> desde `list`.

---

## `competitions` y `competition_players`

| `competitions` | Tipo | Qué es |
|---|---|---|
| `id` | text (PK) | |
| `name` | text | |
| `kind` | text | `league` · `swiss` · `bracket` · `casual` |
| `best_of` | integer | Formato de serie por defecto (1, 3 o 5) |
| `status` | text | `live` · `done` |
| `start` / `end` | date | `end` puede ser nulo |
| `rounds` | integer | Rondas previstas (0 = abierto) |
| `top_cut` | integer | Tamaño del top cut (0 = sin cut) |

`competition_players` es la tabla intermedia: `competition_id`, `player_id`, `seed`, `dropped`.

> Si una competición no tiene participantes apuntados, `compPlayers()` devuelve todos los
> jugadores activos. Así una liga recién creada ya funciona sin configurar nada.

---

## `matches` — la serie

| Columna | Tipo | Qué es |
|---|---|---|
| `id` | text (PK) | |
| `competition_id` | text (nullable) → `competitions.id` | `ON DELETE SET NULL`. Nulo = amistoso suelto |
| `tournament_id` | text (nullable) → `tournaments.id` | `ON DELETE SET NULL`. Si la partida se jugó dentro de un torneo de fuera |
| `round` | integer | Jornada. 0 si no aplica |
| `date` | date | |
| `player_a_id` | text → `players.id` | Siempre alguien del grupo |
| `player_b_id` | text (**nullable**) → `players.id` | **Nulo cuando el rival es de fuera** |
| `opponent_name` | text (nullable) | El nombre del rival externo, cuando `player_b_id` es nulo |
| `deck_a_id` / `deck_b_id` | text (nullable) → `decks.id` | `ON DELETE SET NULL` |
| `opponent_archetype_id` | text (nullable) → `archetypes.id` | `ON DELETE SET NULL`. Qué llevaba el rival externo, que no tiene mazo registrado |
| `best_of` | integer | 1, 3 o 5 |
| `status` | text | `done` (con resultado) · `scheduled` (emparejada, pendiente) |
| `note` | text | |
| `created_by` | text (nullable) → `players.id` | Quién la registró. `ON DELETE SET NULL` |
| `created_at` | timestamptz | |

Índices en `competition_id`, `tournament_id`, `player_a_id`, `player_b_id` y `date`.

> **No hay columna de marcador ni de ganador.** Se deducen contando los `games`. Es lo que hace
> que editar un juego de una partida antigua deje todo coherente sin tocar nada más.
>
> **`deck_*` es `SET NULL`, no `CASCADE`:** borrar un mazo no borra las partidas jugadas con él;
> solo se pierde la referencia y esas partidas dejan de contar para el metagame.

### Partidas contra rivales de fuera

`player_b_id` nulo es lo que distingue una partida contra alguien que no está en la liga: un
rival de una League Cup, de un torneo online o de una tarde de tienda. En vez del jugador se
guardan `opponent_name` (solo su nombre) y `opponent_archetype_id` (qué llevaba, si se sabe).

**Esas partidas cuentan a medias, y a propósito.** El predicado `isInternal()` de
`src/lib/stats.ts` es el que decide dónde entran:

| Entra en | ¿Cuentan? | Por qué |
|---|---|---|
| Ranking, puntos, resistencia | No | El rival no está en la clasificación: no hay a quién restar |
| Elo | No | El Elo es un juego de suma cero; sin rating del rival no se puede compensar |
| Enfrentamientos directos | No | Son entre gente de la liga |
| Uso del metagame y % de victorias por arquetipo | **Sí** | Lo que se mide es el mazo, no el rival |
| Matriz de emparejamientos | **Sí** | Un cruce Dragapult–Gardevoir es igual de informativo lo juegue quien lo juegue |
| Historial y estadísticas personales | **Sí** | Son tus partidas |

---

## `tournaments` — torneos de fuera

La **cabecera** del evento, sin nadie dentro: lo que hizo cada uno va en `tournament_results`.
Están separados a propósito, para que si vais tres a la misma League Cup haya un solo torneo con
tres resultados y no tres torneos repetidos.

| Columna | Tipo | Qué es |
|---|---|---|
| `id` | text (PK) | |
| `name` | text | "League Cup Tienda Kanto — septiembre" |
| `kind` | text | `league_challenge` · `league_cup` · `pokemon_challenge` · `pokemon_cup` · `regional` · `special` · `international` · `worlds` · `store` · `online` · `other` |
| `scope` | text | `onsite` (presencial) · `online` |
| `format` | text | `standard` · `expanded` · `glc` · `limited` · `other` |
| `best_of` | integer | Formato de serie del torneo: 1, 3 o 5 |
| `date` | date | |
| `end_date` | date (nullable) | Para los que duran más de un día |
| `venue` | text | Tienda, sede o plataforma online |
| `city` / `country` | text | |
| `organizer` | text | |
| `url` | text | Enlace a RK9, Limitless o donde esté. Solo se guarda si empieza por `http://` o `https://` |
| `player_count` | integer (nullable) | Cuánta gente hubo. **Determina qué tramos de CP se activan** |
| `rounds` | integer (nullable) | |
| `top_cut` | integer (nullable) | |
| `season` | integer (nullable) | Temporada de Play! Pokémon a la que cuenta |
| `division` | text | `masters` · `seniors` · `juniors` |
| `notes` | text | |
| `created_by` | text (nullable) → `players.id` | `ON DELETE SET NULL` |
| `created_at` | timestamptz | |

Índices en `date`, `kind` y `season`.

> **`kind` es una etiqueta, no una tabla de puntos.** Cuántos CP da cada tipo, con qué límites y
> con qué asistencia mínima vive en `src/lib/cp.ts`, por temporada. Así, cuando Play! Pokémon
> cambia las cifras, no hay que tocar ni el esquema ni los datos guardados.
>
> **`season` puede quedar en blanco** y entonces se deduce de la fecha con `seasonOfDate()`: la
> temporada va de julio a junio y se nombra por el año en que acaba, así que un torneo del 3 de
> agosto de 2026 es de la temporada 2027. Deducirla es importante: sin eso, un resultado sin
> temporada sumaba en todas a la vez.

---

## `tournament_results` — lo que hizo cada uno

| Columna | Tipo | Qué es |
|---|---|---|
| `id` | text (PK) | |
| `tournament_id` | text → `tournaments.id` | `ON DELETE CASCADE` |
| `player_id` | text → `players.id` | `ON DELETE CASCADE` |
| `placement` | integer (nullable) | Puesto final. Nulo si se retiró antes de que hubiera clasificación |
| `wins` / `losses` / `ties` | integer | El récord V–D–E |
| `deck_id` | text (nullable) → `decks.id` | El mazo registrado en la app, si lo hay |
| `archetype_id` | text (nullable) → `archetypes.id` | El arquetipo suelto, si jugó algo que no tiene guardado como mazo |
| `cp_earned` | integer | Championship Points de ese resultado |
| `cp_manual` | boolean | `true` si el número lo puso una persona y no debe recalcularse |
| `prizes` | text | Texto libre: "3 sobres y un playmat" |
| `notes` | text | |
| `dropped` | boolean | Si abandonó |
| `created_at` | timestamptz | |

**Índice único `tr_unique_idx` en (`tournament_id`, `player_id`)**, más un índice normal en
`player_id`.

> **El índice único no es decorativo: es lo que hace posible el upsert.** Guardar un resultado
> es un `INSERT … ON CONFLICT (tournament_id, player_id) DO UPDATE`, una sola sentencia. Con la
> versión anterior —`SELECT`, y luego `INSERT` o `UPDATE` según lo que hubiera— un doble toque
> desde el móvil colaba dos inserciones y saltaba un error 23505 sin capturar.

> **`cp_manual` es un interruptor de "no me lo recalcules".** Con él a `false`, el número sale
> de la tabla de la temporada aplicando el puesto y la asistencia; con él a `true`, manda lo que
> haya tecleado la persona. Sirve para los casos raros: una descalificación, un torneo con
> reparto especial, o unos CP que llegaron por otra vía.

---

## `games` — cada juego

| Columna | Tipo | Qué es |
|---|---|---|
| `id` | serial (PK) | |
| `match_id` | text → `matches.id` | `ON DELETE CASCADE` |
| `number` | integer | 1, 2, 3… |
| `winner` | text | `a` · `b` · `tie` |
| `first` | text | `a` · `b` · `""` si no se anotó |
| `prizes_left` | integer (nullable) | Premios que le quedaban al perdedor (0-6) |
| `turns` | integer (nullable) | Reservado, aún sin interfaz |
| `note` | text | |

`winner` y `first` guardan el **lado** (`a`/`b`), no el id del jugador. Así, si se corrige quién
era el jugador A de una partida, los juegos siguen siendo coherentes con la serie.

> `prizes_left` y `turns` están en el esquema pero no tienen campo en el formulario todavía.
> Añadirlos es un ejemplo trabajado en la [guía de desarrollo](07-guia-de-desarrollo.md#añadir-un-campo-a-una-tabla).

---

## `events` — calendario

| Columna | Tipo | Qué es |
|---|---|---|
| `id` | text (PK) | |
| `title` | text | |
| `date` | date | |
| `kind` | text | `round` · `tourney` · `deadline` · `other` |
| `competition_id` | text (nullable) → `competitions.id` | `ON DELETE SET NULL` |
| `tournament_id` | text (nullable) → `tournaments.id` | `ON DELETE SET NULL` |
| `note` | text | "Casa de Javi, 18:00" |

Una entrada del calendario puede colgar de una competición interna, de un torneo de fuera, o de
nada: "cierre de listas" no necesita ninguna de las dos cosas.

---

## Decisiones que conviene entender

**Las fechas son `date`, no `timestamp`.** Se guardan y se leen como cadenas `"2026-09-12"`, sin
hora ni zona horaria. Una partida ocurre "el 12 de septiembre", no "a las 18:03:22 UTC", y así
no hay sorpresas de zona horaria.

**Los identificadores son `text`, no `serial`.** Los genera la aplicación con `newId()`
(`p-lx8f2k3a1b`). Permite crear un registro y sus hijos en la misma operación sin ir y volver de
la base de datos, y hace que exportar e importar datos no colisione.

**Nada calculado se guarda.** Ni marcadores, ni puntos, ni Elo, ni porcentajes. Todo se deriva
en cada carga desde `matches` + `games`. Cuesta unos milisegundos y elimina de raíz la clase de
error más molesta: el dato acumulado que se desincroniza y ya nadie sabe si es correcto.

---

## Consultar la base de datos a mano

```bash
npm run db:studio
```

Abre un explorador visual donde puedes ver y editar cualquier tabla. También sirve el editor SQL
del panel de Neon, para consultas propias:

```sql
-- las diez partidas más recientes con su marcador
-- El JOIN con el rival es LEFT: en las partidas contra gente de fuera
-- player_b_id es nulo y el nombre está en opponent_name.
SELECT m.date,
       pa.name AS jugador_a,
       COALESCE(pb.name, m.opponent_name) AS jugador_b,
       COUNT(*) FILTER (WHERE g.winner = 'a') AS juegos_a,
       COUNT(*) FILTER (WHERE g.winner = 'b') AS juegos_b
FROM matches m
JOIN players pa ON pa.id = m.player_a_id
LEFT JOIN players pb ON pb.id = m.player_b_id
LEFT JOIN games g ON g.match_id = m.id
WHERE m.status = 'done'
GROUP BY m.id, m.date, pa.name, pb.name, m.opponent_name
ORDER BY m.date DESC
LIMIT 10;
```

```sql
-- CP por jugador en la temporada 2027, sin aplicar el Best Finish Limit
-- (el límite lo aplica computeCp(); esto es la suma bruta)
SELECT p.name, SUM(r.cp_earned) AS cp
FROM tournament_results r
JOIN players p     ON p.id = r.player_id
JOIN tournaments t ON t.id = r.tournament_id
WHERE COALESCE(t.season, CASE WHEN EXTRACT(MONTH FROM t.date) >= 7
                              THEN EXTRACT(YEAR FROM t.date) + 1
                              ELSE EXTRACT(YEAR FROM t.date) END) = 2027
GROUP BY p.name
ORDER BY cp DESC;
```
