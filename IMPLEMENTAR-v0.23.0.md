# PokeArena TCG v0.23.0 — modalidades de liga

Va sobre la **v0.22.0**. **Lleva migración** (`drizzle/0014_v0_23_0.sql`). Sin dependencias nuevas.

1. Descomprime encima del repo.
2. Lanza `drizzle/0014_v0_23_0.sql` en el SQL Editor de Neon. **Hay que lanzar el SQL** aunque uses
   `db:push`: cambia el índice único de los mazos de liga. Las ligas que ya existen quedan como
   «Mazo fijo» y los mazos ya entregados, en el hueco 1.
3. `npm test` (58 de 58) y `npm run build`. Push.

## Las tres modalidades (se eligen al crear o editar la liga)

| Modalidad | Mazos | Series | Clasificación |
| --- | --- | --- | --- |
| Mazo fijo | 1 por persona, bloqueado | La serie por defecto de la liga | Individual |
| Bo3 · hasta 3 mazos | Hasta 3 por persona, bloqueados; en cada serie se juega con uno | Siempre Bo3 | Individual |
| Duelo por equipos | 1 por persona, bloqueado | La serie por defecto | Por equipos + individual |

- **Mazos al registrar una partida de liga:** si la persona entregó mazos, la partida va con uno de
  ellos. Con un solo mazo entregado se pone solo. Para tu lado, un mazo que no vale da un aviso
  claro; para el del rival se corrige en silencio, para no ir revelando sus mazos (son privados).
- **Equipos:** se forman en la ficha de la liga («Crear o editar equipos», organizadores): nombre y
  tres personas en orden. Nadie puede estar en dos equipos de la misma liga.
- **Jornadas por equipos:** «Crear partidas pendientes» cruza equipos todos contra todos (método del
  círculo; con número impar, uno descansa) y crea tres partidas por cruce, puesto contra puesto.
- **Clasificación por equipos:** gana el duelo quien gana 2 de las 3 partidas; duelo ganado 3,
  empatado 1, perdido 0; desempate por partidas ganadas.

## Ficheros

Nuevos: `drizzle/0014_v0_23_0.sql`, `src/lib/modalidades.ts`, `tests/modalidades.test.ts`.
Modificados: `package.json`, `src/db/schema.ts`, `src/lib/data.ts`, `src/actions/index.ts`
(saveCompetition, submitLeagueDeck, createPairings, saveMatch, saveTeam, deleteTeam),
`src/components/CompetitionForm.tsx`, `src/app/(app)/competiciones/[id]/page.tsx`.
