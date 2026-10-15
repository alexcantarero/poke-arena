# PokeArena TCG v0.39.0 — Fase B del rendimiento (parcial)

Va sobre la **v0.38.0**. **Sin migración, sin dependencias, sin variables de entorno.**

Versión pequeña a propósito. Lee «Lo que no entra» antes de preguntarte por qué.

## Paso 1 — Descomprime

| | Fichero |
|---|---|
| M | `package.json`, `CHANGELOG.md`, `docs/13-plan-rendimiento.md` |
| M | `src/lib/data.ts` |
| M | `src/app/(app)/calendario/page.tsx` |

## Paso 2 — Verifica

```bash
npm test          # 436 de 436
npx tsc --noEmit
npm run build
```

## Paso 3 — Comprueba que el calendario sigue igual

Esta versión no cambia **nada** de lo que se ve. Abre `/calendario`, cambia de mes, filtra por
tipo y alterna Calendario/Agenda: tiene que verse exactamente como antes. Si algo falta, es que
alguna tabla se quedó fuera de las tres que ahora se piden.

## Qué he hecho

`/calendario` cargaba el snapshot entero —las 13 consultas, con `matches` y `games` completas—
para pintar un mes. Desde que la v0.38 quitó las partidas del calendario, lo único que
necesitaba eran eventos, torneos y competiciones: tres tablas pequeñas que no crecen.

Esa es la diferencia que importa. `matches` y `games` son las dos únicas tablas que crecen sin
parar, así que una pantalla que las carga sin usarlas tiene un coste que sube con el historial
aunque la pantalla no cambie nunca. Eso es lo que se corta.

Añado también `loadTournamentMatches()`, que trae solo las rondas de torneo —sin jornadas de
liga, sin amistosos y sin juegos—, lista para cuando se pueda usar en `/torneos`.

## Lo que NO entra en la Fase B, y por qué

Prefiero decirlo que entregar un refactor a medias de algo que no puedo compilar.

**`/torneos`** está acoplado a `playerCp(snap, …)`, que recibe el snapshot entero. Para
estrechar la pantalla hay que cambiar antes la firma de `playerCp`, y eso es meter mano al
motor de CP: la pieza con más historial de fallos silenciosos del proyecto (la v0.9.0 se fue
entera en eso). El orden correcto es darle a `playerCp` una entrada estrecha **con pruebas**, y
después cambiar la pantalla. Son dos versiones, no media.

**`/mazos`** necesita de verdad todas las partidas jugadas: `archetypeStats()` recorre el
historial completo para sacar los usos de cada mazo. Aquí no hay nada que recortar sin cambiar
lo que se enseña, o sin precalcular los usos, que es la Fase D y la que más fácil introduce
datos incorrectos.

Las dos cosas quedan escritas en `docs/13-plan-rendimiento.md` para que no haya que volver a
averiguarlo dentro de tres versiones.

## Cómo deshacerlo

`git revert HEAD`. Nada toca la base de datos.
