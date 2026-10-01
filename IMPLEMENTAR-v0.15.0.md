# Arena v0.15.0 — cómo aplicarla

Va sobre la **v0.14.0** (la de `D:\Cambios\Claude outputs\arena.zip`).
29 ficheros: 18 modificados y 11 nuevos. **Lleva migración.**

## Pasos

1. Descomprime encima del repo (respeta las rutas).
2. **Base de datos.** Pega `drizzle/0008_v0_15_0.sql` en el SQL Editor de Neon.
   Es idempotente. Añade `matches.opponent_player_id` y rellena las rondas antiguas
   cuyo rival se escribió con el nombre exacto de alguien del grupo.
   (`npm run db:push` crea la columna pero **no** hace ese relleno.)
3. `npm test`. Los tests nuevos son 18, en 5 ficheros. Ojo con los tuyos (mira «Puede romper» abajo).
4. `npm run build` antes de subir. Aquí no se ha podido lanzar (npm bloqueado).
5. Push a `develop`.
6. En **Torneos**, como organizador, pulsa «Añadir 21 torneos».

## Qué trae

| Petición | Qué se ha hecho |
|---|---|
| «El mensaje no cuadra» | **Dos fallos.** (1) El texto del primer turno medía «gana quien empieza», no «ganas tú cuando empiezas». Ahora dice «saliendo 1.º ganaste X de Y · saliendo 2.º X de Y». Está en `lib/primerTurno.ts`. (2) Un resultado de **0 CP ocupaba un hueco** del Best Finish Limit: por eso salía «3 ocupados · 1 libre» con Gameria a 0. Ahora no ocupa hueco, y el texto explica el tramo: «0 CP: el 9.º–16.º vale 6 CP pero pide 25 jugadores y hubo 20». |
| No hay CP en torneos online | `cpKindOf()` en `cp.ts`. Un torneo con `scope = online` da 0 CP en todas las pantallas y acciones, **aunque esté apuntado como Challenge y aunque el CP se haya puesto a mano**. Los formularios lo explican. |
| Drop | La casilla pasa a llamarse «No he acabado el torneo (drop)». Una vez guardada: <br>• la ficha no ofrece más rondas, sale un aviso en su lugar y el servidor también las rechaza; <br>• aparece la etiqueta **DROP** roja en la cabecera de tu bloque, sin tener que abrirlo. <br>Las rondas ya apuntadas se siguen pudiendo corregir. Desmarcarla lo deshace. |
| Borde cortado en móvil y bolas de CP | El grid del desglose usaba una columna implícita `auto`, y los nombres con `truncate` la estiraban; ahora es `grid-cols-1`. Las barritas son ahora **bolas con los CP de cada hueco**: <br>• cada tramo de puesto tiene su color; <br>• el 1.º sale **dorado, «maxeado»**; <br>• los huecos libres llevan borde discontinuo. <br>También hay bola pequeña en cada fila. |
| El ranking no filtra bien los torneos | `standings()` solo cuenta partidas entre dos del grupo, y por eso con «Presenciales» u «Online» todo salía a 0. Hay ámbito nuevo **Torneos**, y con Torneos, Presenciales u Online se ve el **ranking de torneos**: <br>• torneos jugados; <br>• V–D–E y %V de las rondas; <br>• conversión al top cut, solo sobre torneos con corte y con el «1/2» a la vista; <br>• puesto medio y mejor puesto; <br>• CP de la temporada con su Best Finish Limit. <br>Es ordenable. En «Todo» salen las dos tablas, liga y torneos. |
| Mapa de calor de enfrentamientos | Al final del Ranking: fila contra columna, con el número de cruces y el récord de la fila. Respeta el filtro de arriba. Cuenta liga, amistosos y rondas de torneo contra alguien del grupo. Si los dos apuntáis la misma ronda, **cuenta una vez**. |
| Elegir rival del grupo o un nombre | En el formulario de ronda hay chips con la gente del grupo. Al tocar uno se rellena el nombre y la ronda queda enlazada a su perfil. Si escribes otro nombre, el enlace se suelta solo. La ronda no se convierte en partida interna: no mueve Elo. |
| Torneos de octubre y noviembre | `src/data/torneos-zona-2026.ts`, 21 torneos que entran como **borrador**. <br>• Challenges en Bo1, Cups y Regionales en Bo3. <br>• No duplica: se salta los que ya existan por id, o los creados a mano el mismo día, del mismo tipo y en la misma tienda. <br>• Niza y Gdansk se enlazan con su evento del calendario, que ya no se pinta dos veces. |

## Fechas que conviene mirar

En cuatro torneos el día de la semana de la lista no cuadra con el número. Se ha usado
el número, y la nota del torneo lo dice:

| Torneo | Día escrito | Día real |
|---|---|---|
| Homoludicus | «domingo 17» oct | sábado |
| La Orden del Friki | «lunes 25» oct | domingo |
| Decksden | «sábado 15» nov | domingo |
| Vanilla Games | «sábado 25» nov | miércoles |

**Gdansk** es el **31 oct – 1 nov** (fecha oficial), no el 30.

## Puede romper

El zip que recibí **no traía `tests/`**, así que no he podido pasar tus 261 tests.
Hay dos cambios de comportamiento de `cp.ts` que podrían hacer fallar alguno antiguo, y
en los dos el comportamiento nuevo es el correcto:

- **Un resultado de 0 CP ya no cuenta en `counting` ni sale `excluded`.** Si un test
  esperaba «3 ocupados» con un cero dentro, ahora son 2.
- **`explainCp` y `effectiveCp` con un tipo sin tabla** (online, tienda) devuelven
  `no-cp` y 0 aunque `cpManual` sea true. Antes devolvían `manual` con el número tecleado.

## Ficheros

**Nuevos**
- `drizzle/0008_v0_15_0.sql`
- `src/lib/primerTurno.ts`
- `src/lib/rankingTorneos.ts`
- `src/lib/h2h.ts`
- `src/data/torneos-zona-2026.ts`
- `src/components/H2HHeatmap.tsx`
- `src/components/TournamentRankingTable.tsx`
- `tests/primerTurno.test.ts`
- `tests/rankingTorneos.test.ts`
- `tests/h2h.test.ts`
- `tests/cpOnline.test.ts`
- `tests/torneosZona.test.ts`

**Modificados**
- `package.json` (0.15.0)
- `src/db/schema.ts`
- `src/lib/cp.ts`
- `src/lib/data.ts`
- `src/actions/index.ts`
- `src/app/globals.css`
- `src/app/(app)/ranking/page.tsx`
- `src/app/(app)/torneos/page.tsx`
- `src/app/(app)/torneos/[id]/page.tsx`
- `src/app/(app)/perfil/[id]/page.tsx`
- `src/app/(app)/page.tsx`
- `src/app/(app)/calendario/page.tsx`
- `src/components/CpBreakdown.tsx`
- `src/components/RondasDelGrupo.tsx`
- `src/components/TournamentForm.tsx`
- `src/components/TournamentResultForm.tsx`
- `src/components/TournamentRounds.tsx`

## Verificación hecha aquí

- Tests nuevos: **18 de 18**.
- `tsc` estricto sin `node_modules`: ningún error nuevo frente a la v0.14.0. Los que quedan son
  los de siempre por no tener las librerías instaladas, y ninguno es de sintaxis.
- Imports y exports de los 141 ficheros de `src/`: todos resuelven.
- `npm run build`: **no se ha podido lanzar**.
