# PokeArena TCG v0.17.0 — cómo aplicarla

Va sobre la **v0.16.0**. Ojo: `Poke Arena Code.zip` era idéntico a `PokeArena_V15.1.zip`
(mismo hash), así que la base se reconstruyó como v15.1 + `arena-v0.16.0-cambios.zip`. Si en
`develop` tienes algo más que eso, avisa antes de descomprimir.

31 ficheros: 22 modificados y 9 nuevos. **Lleva migración. Sin dependencias nuevas.**

## Pasos

1. Descomprime encima del repo (incluye `public/logos/regional-championships.png`).
2. Lanza `drizzle/0010_v0_17_0.sql` en el SQL Editor de Neon (o `npm run db:push`). Es idempotente.
3. Edita a mano `public/manifest.webmanifest` (no venía en el zip): `"name": "PokeArena TCG"` y
   `"short_name": "PokeArena"`. Es el nombre que sale al instalar la app en el móvil.
4. `npm test` y `npm run build`. Push.

**Posible test roto:** si tienes un test de `cp.ts` que comprueba que las plazas de 2027 son
`null`, fallará a propósito: ahora son 140/140/125/20/10 (ver abajo). Actualízalo.

## Qué trae

**Nombre.** La marca es «PokeArena TCG» (título de la web, cabecera, barra lateral). El nombre
de la liga («Season 1 - PokeArena») pasa a ir debajo, pequeño.

**Puestos centrados** en los bloques de «Resultados del grupo», en una columna de ancho fijo para
que «119.º» y «1.º» queden alineados.

**Añadir participante (organizadores).** En la ficha del torneo, debajo de los resultados del
grupo: elige a alguien que todavía no sale (p. ej. Lauty) y se abre su bloque con «Gestionar a X»:
ronda 1 y resultado final. Elegir no guarda nada (va por URL, `?anadir=<id>`); queda en el torneo
al guardar su primera ronda o su resultado. Funciona también con el torneo cerrado.

**Favoritos.** Estrella en el perfil de cada uno («Seguir») y en la lista del Mundial. En el
Ranking, filtro «¿A quién? Todos / ★ Favoritos»: recorta las tablas, el cara a cara y el camino
al Mundial. Tú siempre sales. Nadie ve a quién sigues.

**Camino al Mundial (Ranking) y Top España / Europa (perfil).** Se apunta a mano el puesto en el
leaderboard oficial de CP (no hay API y pokemon.com prohíbe extraerlo). Lo edita cada uno o un
organizador, desde el perfil. El Ranking ordena por puesto europeo y dibuja la línea en el Top 140.

**Plazas del Mundial 2027 en `cp.ts`:** Masters 140 Europa · 140 EE. UU./Canadá · 125
Latinoamérica · 20 Oceanía · 10 Oriente Medio y Sudáfrica (Juniors y Seniors: 100/100 en Europa).
Fuente: championships.pokemon.com/en-us/about/2027-season-changes, consultada el 02/10/2026.

**Perfiles clicables:** rondas del torneo (rival del grupo y «Ver perfil» en cada bloque),
avatares de la lista de torneos, tarjetas de partida (toda la app), ficha de partida, emparejamientos
de la liga, partidas pendientes del inicio, ladder, cabeceras del cara a cara, «Mejor puesto».
Donde la fila entera ya era un enlace, ahora el enlace es una capa debajo y los perfiles van encima
(un enlace no puede ir dentro de otro).

**Idioma ES / EN.** Botón en la cabecera (móvil) y junto al tema (escritorio). Cookie
`arena-lang`, la página sale traducida desde el servidor. **Traducido en esta versión:** menú,
cabecera, «Más» y todo lo nuevo (favoritos, Mundial, añadir participante). El resto de pantallas,
por fases: cómo añadir una está en la cabecera de `src/lib/i18n.ts`.

**Calendario.** Con «Calendario» se ve solo la rejilla (más grande, tres eventos por día) y sus
herramientas de organizador; la agenda de debajo ya no sale. Con «Agenda», solo la agenda.

**Logo de Regionales** en la lista de torneos y en la cabecera de la ficha (solo tipo `regional`).

**Móvil.** Título de la ficha más pequeño (un Regional ocupaba tres líneas), «‹ Torneos» encima
del título en vez de en una fila propia, cabecera que recorta el nombre y no los botones.

## Ficheros

Nuevos: `drizzle/0010_v0_17_0.sql`, `public/logos/regional-championships.png`,
`src/components/FavStar.tsx`, `src/components/LangToggle.tsx`, `src/lib/i18n.ts`,
`src/lib/lang.ts`, `src/lib/mundial.ts`, `tests/i18n.test.ts`, `tests/mundial.test.ts`.

Modificados: `package.json`, `src/actions/index.ts` (setLang, togglePlayerFavorite, setZoneRanks),
`src/db/schema.ts`, `src/lib/data.ts`, `src/lib/cp.ts`, `src/lib/nav.ts`, `src/app/layout.tsx`,
`src/app/(app)/layout.tsx`, `mas`, `page.tsx` (inicio), `calendario`, `ranking`, `perfil/[id]`,
`torneos`, `torneos/[id]`, `partidas/[id]`, `competiciones/[id]`, `Nav.tsx`, `Wordmark.tsx`,
`ui.tsx` (PageHead con `icon`, MatchCard, `TournamentEmblem`, `ProfileLink`), `RondasDelGrupo.tsx`,
`Ladder.tsx`, `H2HHeatmap.tsx`.

## Verificación hecha aquí

- Tests nuevos: 8 de 8 (más los 6 de la v16 que venían: 14 de 14). Tu suite completa no venía en el zip.
- `tsc` estricto sin `node_modules`, comparado con la v16: ningún error nuevo real (salió uno,
  una comparación imposible con `"draft"`, y está corregido). El resto es ruido de librerías ausentes.
- `npm run build`: no se puede lanzar en este entorno.
