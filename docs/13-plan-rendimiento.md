# 13 · Plan de rendimiento: salir de `loadSnapshot()`

Escrito el 13/10/2026, sobre la v0.28.0. Léelo entero antes de tocar `src/lib/data.ts`.

## Por qué importa, en números

La app está en **Vercel Hobby**, que incluye unas **4 horas de CPU activa al mes** y pausa el
proyecto al llegar al límite (no cobra de más). La base está en **Neon free**, con **100 CU-hours
por proyecto y mes** y **0,5 GB** de almacenamiento, compartidos entre las ramas del proyecto.

Todo el grupo `(app)` es `force-dynamic`: no hay página estática. Hasta la v0.28, **cada visita a
cualquier pantalla** hacía 13 consultas, leía las tablas `matches` y `games` enteras y recalculaba
el Elo sobre todo el historial. Con cinco jugadores da igual. Con dos temporadas de partidas
encima, las 4 horas de CPU son el techo que se toca primero, antes que el ancho de banda.

Lo que no escala no es el número de visitas: es que **el coste de cada visita crece con el
historial**. Esa es la propiedad que hay que romper.

## Qué se hizo ya en la v0.28.0

1. **El layout dejó de cargar el snapshot.** Era el bloqueo de fondo: el layout de `(app)`
   envuelve todas las pantallas, así que mientras pidiera `loadSnapshot()`, afinar una página
   suelta no servía de nada (`cache()` deduplica, pero la carga ya se había hecho). Ahora pide
   `currentPlayer()` y `loadConfig()`.
2. **El Elo pasó a ser perezoso.** `eloTable()` recorre todas las partidas en orden cronológico;
   solo 6 de las 23 pantallas leen `.elo`. Ahora es un getter memoizado por petición.
3. **Cinco pantallas con consultas propias**: `/mesa`, `/topdecks`, `/mas`, `/torneos/nuevo` y
   `/perfil/editar`.
4. **Tres cargadores estrechos** en `data.ts`: `loadConfig()`, `loadPlayers()`,
   `loadArchetypes()`. Van envueltos en `cache()` y **`loadSnapshot()` los reutiliza**, así que
   una pantalla que pida las dos cosas no consulta dos veces.

## Qué queda, por fases

Las fases están ordenadas por relación entre lo que ahorran y lo que arriesgan. **Haz una,
verifica con `npm run build` y despliega, antes de empezar la siguiente.**

### Fase A — paginar las partidas en Resultados — **HECHA en la v0.29.0**

> Implementada: `src/lib/matchQuery.ts` decide qué baja a SQL, `loadMatchesPage()` en `data.ts`
> hace la consulta, y `npm run verificar:fase-a` comprueba la paridad contra la base real.
> Queda lanzar ese script contra `dev`. Lo que sigue es la descripción original del plan.

#### Descripción original

`/resultados` leía `snap.matches` entero y paginaba de 40 en 40 **después de cargarlo todo**
(la paginación ya iba por URL, `?n=80`, pero acumulativa y sobre el conjunto completo).

- Consulta nueva en `data.ts`: `loadMatchesPage({ limit, offset, filtros })`, con los filtros de
  `src/lib/filters.ts` traducidos a `WHERE` de Drizzle.
- El contador total, con `count(*)`, no trayendo las filas.
- Los `games` de esa página solo, con un `IN (…)` sobre los ids de la página.

Ojo: los filtros de `filters.ts` son módulos puros que operan sobre objetos ya cargados. **No los
reescribas**; añade al lado una función que convierta los mismos parámetros de URL a condiciones
SQL, y deja un test que compruebe que los dos caminos dan el mismo conjunto para un caso conocido.

### Fase B — índices derivados por pantalla — **PARCIAL en la v0.39.0**

> **Hecha:** `/calendario`, que desde la v0.38 (fuera las partidas del calendario) solo
> necesitaba tres tablas pequeñas. Pasa de las 13 consultas del snapshot —con `matches` y
> `games` enteras— a `loadEvents()`, `loadTournamentHeads()` y `loadCompetitionHeads()`.
>
> **No hecha, y por qué:**
>
> - **`/torneos`** está acoplado a `playerCp(snap, …)`, que recibe el snapshot entero. Narrar
>   solo las tablas que la pantalla toca obligaría a cambiar antes la firma de `playerCp`, y
>   eso es tocar el motor de CP: la pieza con más historial de fallos silenciosos del
>   proyecto (v0.9.0). Si se hace, primero se le da a `playerCp` una entrada estrecha y con
>   pruebas, y después se cambia la pantalla. Son dos versiones, no media.
> - **`/mazos`** necesita de verdad todas las partidas jugadas: `archetypeStats()` recorre el
>   historial completo para sacar los usos de cada mazo. Aquí no hay nada que recortar sin
>   cambiar lo que se enseña, o sin precalcular los usos, que es Fase D.
>
> Lo que sigue es la descripción original del plan.

#### Descripción original

`/calendario` solo necesita eventos, torneos y las partidas con fecha en el mes que se mira.
`/mazos` necesita mazos, arquetipos y favoritos. `/torneos` necesita torneos y jugadores.

Para cada una, una función `loadXParaPantalla()` en `data.ts` con las tablas que de verdad usa.
La tabla de qué usa cada pantalla está al final de este documento.

### Fase C — cachear el metagame y los catálogos entre peticiones (riesgo medio)

`loadArchetypes()` y el metagame presencial cambian como mucho una vez al día, pero hoy se
consultan en cada visita. Envuélvelos en `unstable_cache` de Next con una etiqueta por dominio
(`archetypes`, `meta`) y llama a `revalidateTag()` desde las Server Actions que los escriben.

Esto sí cachea **entre** peticiones, así que un fallo aquí se ve como «datos viejos». Por eso va
después de A y B, y por eso solo se aplica a lo que no es de la liga en vivo.

### Fase D — precalcular el Elo (riesgo alto, solo si hace falta)

El Elo es, por diseño, un recorrido de todo el historial. Mientras el getter perezoso baste, no
toques esto. Si algún día el Ranking tarda:

- Tabla `elo_snapshots` con el estado tras la última partida procesada.
- Al guardar una partida, se avanza el Elo desde ahí en vez de rehacerlo entero.
- **Riesgo real**: editar o borrar una partida antigua invalida todo lo posterior. Haría falta un
  recálculo desde la fecha de la partida tocada, y un botón de «recalcular todo» por si acaso.

No empieces por aquí. Es la optimización que más fácil introduce datos incorrectos.

## Cómo medir si esto sirve

- **Vercel → Usage → Active CPU.** Es la cifra que manda. Mírala antes y después de cada fase.
- **Neon → Monitoring → compute hours.** Sube con las consultas, no con el tráfico.
- En local, `npm run dev` y la pestaña Network: el tiempo del documento HTML de cada ruta.

Apunta la cifra de antes en la entrada del CHANGELOG. Sin eso, la siguiente fase se decide a ojo.

## Tareas listas para pegar a un agente

### Fase A

```
Lee CLAUDE.md y docs/13-plan-rendimiento.md.

Haz la Fase A del plan de rendimiento, en una rama nueva `perf-fase-a` desde `development`.

Antes de tocar nada, entrégame un plan numerado: qué ficheros, en qué orden, qué riesgos y qué
pruebas. Espera mi aprobación.

Reglas concretas para esta fase:
- NO reescribas src/lib/filters.ts. Añade al lado la traducción de los mismos parámetros a
  condiciones de Drizzle, y un test que compruebe que los dos caminos dan el mismo conjunto
  para un caso conocido.
- El contador total va con count(*), no trayendo filas.
- La paginación del cliente se sustituye por la del servidor, por URL (?pagina=), para que siga
  funcionando sin JavaScript y se pueda compartir el enlace.

Al terminar: npm test, npx tsc --noEmit y npm run build, con la salida pegada. Si el build falla,
para y dime por qué antes de arreglar nada.
```

### Fase B

```
Lee CLAUDE.md y docs/13-plan-rendimiento.md.

Haz la Fase B en una rama `perf-fase-b` desde `development`, una pantalla por commit, empezando
por /calendario y siguiendo por /mazos y /torneos.

Para cada pantalla: mira qué campos del snapshot usa de verdad (la tabla está al final del
documento), escribe loadXParaPantalla() en data.ts con solo esas tablas, y cambia la pantalla.
No cambies lo que se ve: esta fase no toca la interfaz.

Al terminar cada pantalla: npm test, npx tsc --noEmit y npm run build, con la salida pegada.
```

## Anexo: qué usa cada pantalla del snapshot

Medido el 13/10/2026 sobre la v0.28.0. Las pantallas marcadas **ya no** llaman a `loadSnapshot()`.

| Pantalla | Campos del snapshot que usa |
| --- | --- |
| `(app)/layout.tsx` | **ninguno** (v0.28) |
| `/mesa` | **ninguno** (v0.28: `loadPlayers`) |
| `/topdecks` | **ninguno** (v0.28: `loadArchetypes`) |
| `/mas` | **ninguno** (v0.28: `currentPlayer`) |
| `/torneos/nuevo` | **ninguno** (v0.28: `loadConfig`) |
| `/perfil/editar` | **ninguno** (v0.28: `currentPlayer` + `loadArchetypes`) |
| `/torneos/[id]/editar` | `config`, `toursById` |
| `/calendario` | `competitions`, `events`, `matches`, `playersById`, `tournaments`, `toursById` |
| `/mazos/nuevo` | `archetypes`, `players`, `playersById` |
| `/mazos/[id]` | `archById`, `archetypes`, `decksById`, `players`, `playersById` |
| `/partidas/nueva` | `archetypes`, `competitions`, `decks`, `players`, `tournaments` |
| `/mazos` | `archById`, `archIndex`, `archetypes`, `decks`, `favoriteDecks`, `matches`, `playersById` |
| `/torneos` | `archIndex`, `config`, `matches`, `players`, `playersById`, `tournaments` |
| `/ajustes` | `archetypes`, `config`, `decks`, `matches`, `players`, `tournaments` |
| `/competiciones` | `competitions`, `config`, `elo`, `matches`, `players`, `playersById` |
| `/partidas/[id]` | `archById`, `archIndex`, `config`, `decksById`, `matches`, `players`, `playersById`, `toursById` |
| `/resultados` | casi todo, más `matches` entero → **Fase A** |
| `/ranking` | casi todo, más `elo` → el más pesado |
| `/` (inicio) | casi todo, más `elo` |
| `/estadisticas` | casi todo |
| `/competiciones/[id]` | casi todo, más `elo` |
| `/torneos/[id]` | casi todo, más `elo` |
| `/perfil/[id]` | casi todo, más `elo` |

Las seis últimas son las pantallas caras de verdad y las que más se usan. Son también las que
peor se dejan afinar sin tocar la interfaz, por eso van después de las fases A y B.
