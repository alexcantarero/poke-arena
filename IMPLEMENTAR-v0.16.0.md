# Arena v0.16.0 — cómo aplicarla

Va sobre la **v0.15.1**: la de `PokeArena_V15_1.zip`, que coincide exactamente con la mía.
Son 19 ficheros: 14 modificados y 5 nuevos. **Sin migración y sin dependencias nuevas.**

## Pasos

1. Descomprime encima del repo.
2. Ejecuta `npm test` y después `npm run build`.
3. Push.

## Qué trae

### 1. Permisos del organizador
El organizador (owner o admin) ve en el bloque de cada jugador un panel **«Gestionar a X»**. Desde ahí puede:
- apuntarle la siguiente ronda;
- editar su resultado final;
- editar y eliminar sus rondas, también con el torneo cerrado.

Las Server Actions ya aceptaban un `playerId` ajeno para un organizador; lo que faltaba era la pantalla. `saveTournamentRound` y `deleteTournamentRound` aceptan ahora torneos cerrados si quien edita es organizador.

### 2. Menú
- **«Competiciones» pasa a llamarse «Liga»**, con un icono de escudo. La URL sigue siendo `/competiciones`.
- El menú lateral y «Más» del móvil van en cuatro grupos:
  - **Principal**: Inicio, Calendario
  - **Competir**: Torneos, Liga, Resultados
  - **Análisis**: Ranking, Estadísticas, Top Decks, Mazos
  - **Cuenta**: Mi perfil, Ajustes

### 3. Calendario y Torneos
- **Calendario.** En las celdas, los torneos llevan a su ficha y las partidas a la suya.
- **Selector Calendario | Agenda.** La agenda va agrupada por mes y respeta el filtro de tipo. Cada evento enseña, en este orden:
  1. la fecha, en un bloque grande;
  2. el nombre, grande;
  3. el tipo, en chip, junto a cuánto falta y dónde.
- **Torneos.** Hay filtros de persona, tipo, estado y fechas desde/hasta. Son un formulario por URL: se pueden compartir y funcionan sin JavaScript.
- La lista va en tres grupos, en este orden estricto:
  1. **Hoy**
  2. **Próximos**, del más cercano al más lejano
  3. **Pasados**, del más reciente al más antiguo

  El grupo lo decide la fecha, no el estado. Un torneo de ayer sin cerrar sale en Pasados con su chip «En curso», para que se note que falta cerrarlo.

### 4. Partidas y rondas
- **Volver.** La ficha de una partida de torneo enseña **«‹ Volver al torneo»**; la de una partida de liga, «‹ Volver a la liga».
- **Eliminar.** Al lado de «Editar», en cada ronda, hay un botón **«Eliminar»** que pide confirmación.
- **«Borrar este resultado» estaba roto.** Solo borraba la fila del resultado:
  - las rondas seguían ahí, así que en la ficha parecía que no había borrado nada;
  - con el resultado se iba el mazo fijado, y por eso la ronda siguiente volvía a pedir el arquetipo.

  Ahora se llama **«Borrar mi/su participación (resultado y rondas)»**, pide confirmación y borra las dos cosas. Para borrar una sola ronda está «Eliminar».
- **El puesto, a la derecha.** Cada bloque de jugador enseña su puesto final, grande, con «de N» debajo, siempre que esté puesto. Antes, en un Challenge, la pestaña por defecto del suizo lo escondía.

### 5. Medallas
- **Challenge y Cup** llevan un podio:
  - 1.º oro (maxeado);
  - 2.º plata;
  - 3.º–4.º bronce;
  - lo demás que puntúa, en **acero**, un azul oscuro mate que ya no se confunde con la plata.
- **Regional, Special, Internacional y Mundial** usan una escala de diez rangos con la paleta de tu imagen:

| Puesto | Rango |
|---|---|
| 1.º | Challenger |
| Top 4 | GrandMaster |
| Top 8 | Master |
| Top 16 | Diamante |
| Top 32 | Esmeralda |
| Top 64 | Platino |
| Top 128 | Oro |
| Top 256 | Plata |
| Top 512 | Bronce |
| Top 1024 | Hierro |

  Frankfurt, con el puesto 410 de 3.342, sale **Bronce · Top 512**. El rango aparece en el tooltip y como chip en la fila.

## Decisiones

- **«Top N» significa puesto ≤ N.** Del 1.025 para abajo no hay rango y la medalla sale en acero.
- **En la imagen solo se distinguen nueve emblemas.** El Platino no aparece claramente, así que lo he hecho en turquesa, que es su color habitual en esa escala, y la Esmeralda en verde. Si queréis otro tono, es una clase en `globals.css`: `.cp-rank-platinum`.
- **Los colores son degradados en CSS, no los emblemas.** Dibujar esos emblemas sería copiar un diseño de un juego ajeno; lo que se toma es la paleta.

## Ficheros

Nuevos:
- `src/components/ConfirmButton.tsx`
- `src/lib/rangos.ts`
- `src/lib/torneosLista.ts`
- `tests/rangos.test.ts`
- `tests/torneosLista.test.ts`

Modificados:
- `package.json` (0.16.0)
- `src/actions/index.ts`
- `src/app/(app)/calendario/page.tsx`
- `src/app/(app)/competiciones/page.tsx`
- `src/app/(app)/mas/page.tsx`
- `src/app/(app)/partidas/[id]/page.tsx`
- `src/app/(app)/torneos/[id]/page.tsx`
- `src/app/(app)/torneos/page.tsx`
- `src/app/globals.css`
- `src/components/CpBreakdown.tsx`
- `src/components/Nav.tsx`
- `src/components/RondasDelGrupo.tsx`
- `src/components/icons.tsx`
- `src/lib/nav.ts`

## Verificación hecha aquí

- **Tests:** 27 de 27. Son 6 nuevos: 3 de rangos y 3 de la lista de torneos.
- **`tsc` estricto sin `node_modules`:** ningún error nuevo de verdad y ninguno de sintaxis.
- **Imports y exports:** los 145 ficheros resuelven.
- **`npm run build`:** no se puede lanzar en este entorno.
