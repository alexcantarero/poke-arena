# Arena v0.15.1 — cómo aplicarla

Va sobre la **v0.15.0**: 18 ficheros, 15 modificados y 3 nuevos. **No cambia el esquema.**

> El `Poke_arena_V15.zip` que dejaste en `D:\Cambios\Claude outputs` es idéntico, byte a byte,
> al `arena.zip` de la v0.14. Por eso he trabajado sobre la v0.15.0 que te entregué, que es la que
> sale en tus capturas. Si tocaste algo a mano después de aplicarla, revisa el diff de
> `ranking/page.tsx`, que es el que más cambia.

## Pasos

1. Descomprime encima del repo.
2. **Opcional, pero recomendado:** abre `drizzle/0009_v0_15_1_reparar_rondas.sql` en el SQL Editor de Neon.
   - Lanza primero el `SELECT` y comprueba que sale la R3 de Alex contra Ibai en Monstercards.
   - Después lanza el `UPDATE`. Devuelve al torneo las rondas que se convirtieron en partida interna al editarlas.
3. `npm test` y después `npm run build`.

## Qué trae

| Petición | Qué se ha hecho |
|---|---|
| Drop más accesible, desde la ronda | El formulario de la siguiente ronda lleva abajo **«DROP · me retiro»**, que pide confirmación. Al pulsarlo:<br>• se apunta el drop;<br>• deja de salir el formulario de ronda;<br>• el aviso rojo de la ficha tiene **Deshacer**.<br>Del resultado final se ha quitado la casilla; el valor se conserva al guardar. |
| Historial del perfil desordenado | Ahora va por fecha descendente y, el mismo día, por ronda descendente (R4, R3, R2, R1). Antes se le daba la vuelta al orden de la base, que no garantiza nada. Aplicado en Perfil y en Resultados. Lleva test. |
| El mazo del J2 se sale de la pantalla | Faltaba `min-w-0` en las columnas de la cabecera de la partida, así que el `truncate` no recortaba. |
| Historial con panel propio | Ese panel ya existe: **Resultados**, con filtros de persona, torneo, fecha, mazo, tipo… En el móvil está en «Más». El perfil enseña ahora las **8 últimas** y un botón «Ver todas en Resultados», ya filtrado por esa persona y su ámbito. El filtro de persona encuentra también las rondas en las que alguien del grupo fue el rival. |
| Bolas más profesionales | Ahora son medallas:<br>• **1.º oro** (maxeado);<br>• **2.º plata**;<br>• **3.º–4.º bronce**;<br>• lo que puntúa por debajo, en una **escala de grises** que oscurece con el tramo. |
| Rival del grupo como desconocido | Las pantallas solo miraban `playerBId` y no el rival enlazado (`opponentPlayerId`). Ahora salen su avatar, su nombre y su enlace en tres sitios:<br>• Resultados;<br>• el Perfil;<br>• la ficha de partida.<br>En las rondas del torneo sale además un avatar pequeño. |
| Al editar, la ronda desaparecía y salía como amistoso | «Editar» abría el formulario de partida genérica. Al elegir allí a Ibai, la ronda pasaba a ser una partida interna con `playerBId`: salía del torneo y quedaba sin competición, «Amistoso suelto». **Ahora una ronda de torneo se edita con el formulario de ronda** y sigue en el torneo. Las que ya se rompieron se arreglan con el SQL del paso 2. |
| «Te falta 1 ronda» y «tienes las 4» a la vez | La siguiente ronda era «la última + 1», así que con R1, R2 y R4 pedía la 5. Ahora es el **primer hueco**: pide la R3. |
| «Todo» en una sola tabla | Liga, torneos y sueltos sumados por persona:<br>• Pts, %V, V–D–E y PJ;<br>• Elo;<br>• CP;<br>• Torneos, %Cut y puesto medio.<br>Los torneos con el resultado tecleado y sin rondas también suman su récord. |
| Filtros del Ranking confusos | Era el doble «Amistosos»: el de arriba es **una competición vuestra que se llama así**, y el de abajo era el ámbito. Ahora hay una sola pregunta, «¿Qué partidas cuentan?», con cuatro opciones: Todo, Liga, Torneos y Sueltos. Debajo de la elegida sale una frase que dice qué entra. Además:<br>• el selector de competición solo sale en Liga;<br>• el de presencial u online, solo en Torneos;<br>• la temporada va aparte;<br>• abajo se dice cuántas partidas y torneos cuentan.<br>Los enlaces viejos `?ambito=onsite` y `?ambito=online` siguen funcionando. |

## Decisiones que conviene saber

- **«Sueltos» y no «Amistosos».** Así no choca con vuestra competición «Amistosos». Si preferís otro nombre, es una línea en `VISTAS`, en `ranking/page.tsx`.
- **Una ronda contra alguien del grupo no mueve Elo**, ni antes ni ahora. Cada uno apunta la suya y el mapa de enfrentamientos la cuenta una vez.
- El formulario de partida genérica sigue permitiendo etiquetar una partida interna con un torneo («¿Fue en un torneo?»). Eso es legítimo, pero no es una ronda.

## Ficheros

**Nuevos:**
- `drizzle/0009_v0_15_1_reparar_rondas.sql`
- `src/components/RankingTodoTable.tsx`
- `tests/historial.test.ts`

**Modificados:**
- `package.json` (0.15.1)
- `src/actions/index.ts` (`dropFromTournament`, `undoDrop`)
- `src/app/(app)/partidas/[id]/page.tsx`
- `src/app/(app)/perfil/[id]/page.tsx`
- `src/app/(app)/ranking/page.tsx`
- `src/app/(app)/resultados/page.tsx`
- `src/app/(app)/torneos/[id]/page.tsx`
- `src/app/globals.css`
- `src/components/CpBreakdown.tsx`
- `src/components/RondasDelGrupo.tsx`
- `src/components/TournamentResultForm.tsx`
- `src/components/TournamentRounds.tsx`
- `src/components/ui.tsx` (avatar `xs`)
- `src/lib/filters.ts`
- `src/lib/stats.ts` (`porRecientes`)

## Verificación hecha aquí

- Tests nuevos de la v0.15 y la v0.15.1: **21 de 21**.
- `tsc` estricto sin `node_modules`: ningún error nuevo de verdad. Los que cambian son los artefactos de siempre por no tener `drizzle` instalado. Ningún error de sintaxis.
- Imports y exports de los 142 ficheros: todos resuelven.
- `npm run build`: no se puede lanzar aquí.
