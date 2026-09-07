# 04 · Modelo de datos

Nueve tablas en PostgreSQL. El esquema vive en **`src/db/schema.ts`** y es la única fuente de
verdad: `npm run db:push` lo aplica a la base de datos.

---

## Cómo encaja todo

```
                      ┌───────────────┐
                      │   settings    │  una sola fila, id = "default"
                      └───────────────┘

  ┌─────────┐        ┌──────────────┐        ┌──────────────┐
  │ players │───────<│    decks     │>───────│  archetypes  │
  └─────────┘        └──────────────┘        └──────────────┘
       │  │                  │                Pokémon principal
       │  │                  │                + secundario
       │  │                  │
       │  │           ┌──────────────┐
       │  └──────────<│   matches    │>─── deck_a_id / deck_b_id
       │              └──────────────┘
       │                     │
       │              ┌──────────────┐
       │              │    games     │  un registro por juego de la serie
       │              └──────────────┘
       │
       │              ┌──────────────────────┐      ┌───────────────┐
       └─────────────<│ competition_players  │>─────│ competitions  │
                      └──────────────────────┘      └───────────────┘
                                                            │
                                                     ┌───────────────┐
                                                     │    events     │
                                                     └───────────────┘
```

Dos ideas centrales:

1. **Un `match` es la serie completa; un `game` es cada juego de dentro.** Así un Bo3 que
   acaba 2–1 son un `match` y tres `games`. El marcador nunca se guarda: se deriva contando los
   juegos, y por eso no puede quedar desfasado.
2. **El `archetype` es la unidad de las estadísticas, no el `deck`.** Cada jugador tiene su
   mazo con su nombre y su lista, pero si dos llevan Dragapult, los dos apuntan al mismo
   arquetipo y suman a la misma casilla de la matriz de emparejamientos.

---

## `settings` — configuración de la liga

Una sola fila, con `id = "default"`.

| Columna | Tipo | Qué es |
|---|---|---|
| `id` | text (PK) | Siempre `"default"` |
| `name` | text | Nombre de la liga |
| `season` | text | Temporada, se ve bajo el logo |
| `pts_win` / `pts_tie` / `pts_loss` | integer | Puntuación (3 / 1 / 0 por defecto) |
| `elo_start` | integer | Elo de partida (1000) |
| `elo_k` | integer | Factor K del Elo (24) |
| `invite_code` | text | Código de acceso. Vacío = se usa el de `.env` |
| `updated_at` | timestamptz | Última modificación |

> Nada de esto se guarda "calculado" en ninguna otra tabla. Cambiar `pts_win` recalcula la
> clasificación entera en la siguiente carga de página.

---

## `players` — jugadores

| Columna | Tipo | Qué es |
|---|---|---|
| `id` | text (PK) | Generado por la app (`p-lx8f2k3a1b`) |
| `name` | text | Nombre visible |
| `color` | text | Color del avatar (`#f0b429`) |
| `is_admin` | boolean | Organizador. Hoy es informativo; sirve de gancho para restringir acciones |
| `active` | boolean | Si cuenta en el ranking y aparece en los desplegables |
| `pin` | text (nullable) | PIN opcional para entrar como este jugador |
| `joined` | date | Fecha de alta |
| `created_at` | timestamptz | |

> **Por qué `active` y no borrar.** Un jugador con partidas no se puede borrar sin dejar el
> historial huérfano. `deletePlayer()` en `src/actions/index.ts` comprueba si tiene partidas: si
> las tiene, lo desactiva; si no, lo borra de verdad.

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
| `round` | integer | Jornada. 0 si no aplica |
| `date` | date | |
| `player_a_id` / `player_b_id` | text → `players.id` | |
| `deck_a_id` / `deck_b_id` | text (nullable) → `decks.id` | `ON DELETE SET NULL` |
| `best_of` | integer | 1, 3 o 5 |
| `status` | text | `done` (con resultado) · `scheduled` (emparejada, pendiente) |
| `note` | text | |
| `created_at` | timestamptz | |

Índices en `competition_id`, `player_a_id`, `player_b_id` y `date`.

> **No hay columna de marcador ni de ganador.** Se deducen contando los `games`. Es lo que hace
> que editar un juego de una partida antigua deje todo coherente sin tocar nada más.
>
> **`deck_*` es `SET NULL`, no `CASCADE`:** borrar un mazo no borra las partidas jugadas con él;
> solo se pierde la referencia y esas partidas dejan de contar para el metagame.

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
| `note` | text | "Casa de Javi, 18:00" |

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
SELECT m.date,
       pa.name AS jugador_a,
       pb.name AS jugador_b,
       COUNT(*) FILTER (WHERE g.winner = 'a') AS juegos_a,
       COUNT(*) FILTER (WHERE g.winner = 'b') AS juegos_b
FROM matches m
JOIN players pa ON pa.id = m.player_a_id
JOIN players pb ON pb.id = m.player_b_id
LEFT JOIN games g ON g.match_id = m.id
WHERE m.status = 'done'
GROUP BY m.id, m.date, pa.name, pb.name
ORDER BY m.date DESC
LIMIT 10;
```
