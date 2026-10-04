# PokeArena TCG v0.18.0 — cómo aplicarla

Va sobre la **v0.17.0** (`PokeArenaCodeV17.zip`, que coincide con la entregada).
Ficheros: ver la lista al final. **Lleva migración. Sin dependencias nuevas.**

## Pasos

1. Descomprime encima del repo.
2. **Lanza `drizzle/0011_v0_18_0.sql` en el SQL Editor de Neon.** Obligatorio aunque uses
   `npm run db:push`: `db:push` crea la columna y la tabla, pero no cambia los CHECK del ladder,
   y sin eso guardar un rango de Novato (1–550) fallaría en la base de datos.
3. `npm test` y `npm run build`. Push.

**Posible test roto:** si tienes tests antiguos del ladder que esperan el rango 1500–2000,
fallarán a propósito (la escala ha cambiado). Los nuevos están en `tests/ladderEscala.test.ts`.

## Qué trae

### Interfaz
- **Liga en móvil:** las tarjetas «Jornada N» y «Pendientes» se salían por la derecha (cortaban
  «Crear partidas» y «Anotar»). Causa: la rejilla sin `grid-cols-1` y sin `min-w-0` se ensanchaba
  con el contenido. Arreglado, y la pista del tipo de liga se recorta.
- **Puestos alineados** en «Resultados del grupo»: la columna derecha (récord, CP, premios) tiene
  ancho fijo, así que el puesto cae en el mismo sitio en todas las filas.
- **Nombre y avatar clicables** en «Resultados del grupo» → perfil. El resto de la fila sigue
  abriendo/plegando las rondas.
- **«Nueva competición» y «Editar competición» plegadas** por defecto (la nueva sale abierta solo si
  aún no hay ninguna liga).
- **Traducción automática del navegador bloqueada** (`translate="no"` + meta `notranslate`). El único
  cambio de idioma es el botón ES/EN.
- **Iconos rotos al pulsar «Comparar»** en Estadísticas: «Dónde os separáis del mundo» pedía el sprite
  con el NOMBRE del arquetipo (404). Ahora usa el Pokémon principal y el secundario.
- **Emblemas de Challenge, Cup y Online** en calendario (cada día), agenda, lista de torneos y ficha.
  Escudos propios (`src/components/Emblems.tsx`) a juego con el logo del Regional; sin Poké Ball ni
  logos oficiales. Un torneo online lleva el emblema Online aunque sea un Challenge.

### Liga: mazo bloqueado
- En la ficha de cada liga, bloque **«Mazo de liga»**: cada participante elige su mazo (o solo el
  arquetipo), confirma y queda **bloqueado** en base de datos. Solo un organizador puede desbloquearlo.
- **Privado:** tabla aparte (`league_decks`) que no entra en el snapshot. El servidor filtra antes de
  pintar: el organizador ve todos, cada jugador solo el suyo, el resto solo «X de N lo han entregado».
- No se aplica solo a las partidas de liga: es una declaración.

### Ladder, ranking y temporadas
- **Escala nueva** (`src/lib/rank.ts`):
  - 1–550 **Novato**. Al pasar de 550 → **salto a 1500 (Liga Arceus)**. Escribir 551–1349 guarda 1500.
  - 1350–1449 **Hierro**; desde 1500 se puede volver a bajar hasta 1350.
  - 1450 Bronce · 1530 Plata · 1610 Oro · 1690 Platino · 1770 Diamante · 1850 Maestro ·
    1975 Gran Maestro · **2100 Challenger**. Fuera de 1–550 y 1350–2100 se rechaza.
  - El editor ya no tiene deslizador (con el hueco del salto mentía): campo numérico, atajos a cada
    tier y aviso del salto. Colores nuevos para Novato y Hierro, medidos a ≥4,5:1.
- **Gráfico del líder** (Ranking → Ladder): serie temporal de su rango desde el último reset, con el
  tiempo real en el eje X y los suelos de cada tier.
- **Reset global** (Ajustes, solo organizadores, escribiendo «nueva temporada»): quita el rango del
  ladder a todos y marca el inicio de temporada. Opciones: reiniciar también el Elo de la liga
  (fecha de corte, reversible) y borrar los puestos de España/Europa. El historial no se borra.

## Ficheros

Nuevos: `drizzle/0011_v0_18_0.sql`, `src/components/Emblems.tsx`, `src/components/LadderTimeline.tsx`,
`tests/ladderEscala.test.ts`.

Modificados: `package.json`, `src/actions/index.ts` (submitLeagueDeck, unlockLeagueDeck,
resetLadderSeason, setLadderElo), `src/db/schema.ts`, `src/lib/data.ts`, `src/lib/rank.ts`,
`src/app/globals.css`, `src/app/layout.tsx`, `ajustes`, `calendario`, `competiciones`,
`competiciones/[id]`, `ranking`, `torneos`, `torneos/[id]`, `Ladder.tsx`, `RondasDelGrupo.tsx`,
`statistics/GlobalMeta.tsx`, `ui.tsx`.

## Verificación hecha aquí

- Tests: 20 de 20 (6 nuevos de la escala del ladder). Tu suite completa no venía en el zip.
- `tsc` estricto sin `node_modules`, comparado con la v17: ningún error nuevo real; lo que cambia es
  ruido de librerías ausentes (tipos de Drizzle y de React).
- `npm run build`: no se puede lanzar en este entorno.
