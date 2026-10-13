# PokeArena TCG v0.30.0 — cómo aplicarla

Va sobre la **v0.29.0**.

> **Lleva migración de base de datos.** Sin dependencias nuevas, sin variables de entorno nuevas.

---

## Antes de nada: la regla no es la que pensabas

Me pediste un check de «2 prize loss» que **añada 2 premios a los ya cogidos**. Lo he
comprobado contra el reglamento antes de guardar nada, porque esto decide cómo queda el dato
para siempre.

Las Penalty Guidelines de Play! Pokémon dicen que, tras una penalización de Double Prize Card,
al rival del infractor se le informa de que **para ganar esa partida debe tomar dos premios
menos de los que normalmente necesitaría**. Y las Floor Rules lo recalcan: cuando un jugador
recibe una penalización de premios, su rival **no toma cartas de premio**; lo que se reduce no
es el número de premios restantes, sino el número de premios que hay que tomar para ganar.

O sea: el penalizado no regala dos premios. Su rival pasa de necesitar 6 a necesitar 4.

**El ganador sale el mismo, pero el margen no.** Si el rival gana cogiendo 4 premios y tú
apuntas «6 porque +2 de penalización», estás guardando un marcador que nunca estuvo en la mesa,
y la media de margen por arquetipo saldría torcida justo en las partidas más raras.

Así que lo he implementado guardando **hechos en crudo** —cuántos premios cogió cada uno y
quién recibió la penalización— y derivando el objetivo. Si el reglamento vuelve a cambiar, se
toca una función y lo ya guardado sigue valiendo, porque no lleva la regla dentro.

En la pantalla se ve así: al marcar la penalización de un jugador, debajo del **otro** aparece
«gana con 4».

---

## Paso 1 — Descomprime

`pokearena-v0.30.0-cambios.zip` en la raíz del repo, respetando rutas.

| | Fichero |
|---|---|
| M | `package.json` (0.29.0 → 0.30.0) |
| M | `CHANGELOG.md` |
| M | `docs/14-datos-y-visualizacion.md` |
| M | `src/db/schema.ts` |
| M | `src/db/seed.ts` |
| M | `src/actions/index.ts` |
| M | `src/components/MatchForm.tsx` |
| M | `src/components/TournamentRounds.tsx` |
| M | `src/app/(app)/partidas/[id]/page.tsx` |
| M | `tests/rounds.test.ts`, `tests/v0_5_0.test.ts` |
| U | `drizzle/0016_v0_30_0.sql` |
| U | `src/lib/premios.ts` |
| U | `src/components/PrizePicker.tsx` |
| U | `tests/premios.test.ts` |
| U | `IMPLEMENTAR-v0.30.0.md` |

---

## Paso 2 — La migración

**Lánzala en una rama de Neon antes que en producción.** Es idempotente.

```sql
-- drizzle/0016_v0_30_0.sql, en el SQL Editor de Neon
```

`npm run db:push` **no basta**: crea las columnas pero no pone los CHECK de rango ni hace la
retirada condicional de `prizes_left`.

**Qué hace el paso 4 del SQL, y por qué así.** `prizes_left` era una sola columna para los dos
lados, así que no sirve para lo que hace falta ahora. Debería estar entera a `NULL`, porque la
acción la leía pero ningún formulario la enviaba nunca. El SQL **comprueba** esa suposición en
vez de fiarse de ella: si encuentra un solo valor, deja la columna donde está y lo dice por
consola. Mira los avisos del SQL Editor después de lanzarlo:

- `prizes_left estaba vacía y se ha retirado.` → todo normal.
- `prizes_left TIENE DATOS: se conserva.` → avísame y vemos qué hay ahí antes de tocar nada.

---

## Paso 3 — Verifica

```bash
npm test          # 384 de 384
npx tsc --noEmit  # sin salida
npm run build
```

Los dos primeros los he ejecutado aquí.

---

## Paso 4 — Pruébalo a mano

En **Registrar partida** y en **apuntar una ronda de torneo**, dentro de cada juego:

1. Las dos filas de botones del 0 al 6 deben caber en una línea en el móvil.
2. **Pulsa un número y vuelve a pulsarlo**: se borra. Así se distingue «0 premios» de «no lo
   apunté», que no son lo mismo.
3. Marca un ganador y dale al perdedor 6 premios: debe salir un aviso en rojo, **y debe dejarte
   guardar igual**. Los avisos no bloquean.
4. Marca la penalización de un jugador: debajo del otro debe aparecer «gana con 4».
5. Guarda y abre la ficha de la partida: cada juego debe enseñar su marcador, «6-3», con una
   «·P» roja si hubo penalización.

---

## Qué he hecho

### El apartado visual

`src/components/PrizePicker.tsx`. Botones y no un desplegable: son siete opciones y esto se
rellena de pie, entre ronda y ronda, con una mano. Objetivos táctiles de 44 px, siete caben en
un móvil de 360. Está montado en los dos sitios donde se apuntan juegos: el formulario de
partida y el de rondas de torneo.

### La lógica, aparte y probada

`src/lib/premios.ts`, puro y sin imports, como el resto de módulos que se prueban:

- `objetivoDe(penalizadoElRival)` → 6 o 4.
- `avisosDePremios()` → lo que chirría, en texto, **sin bloquear**.
- `margenDe()` → premios que le faltaban al perdedor, y el marcador desde el ganador.
- `resumenDeMargen()` → la media, los juegos ajustados y las palizas.

14 pruebas, una de ellas dedicada al caso de la penalización.

### Tres decisiones que conviene no deshacer

**Nulo no es cero.** No apuntar los premios y apuntar un 0 son cosas distintas. La misma regla
que ya aplicasteis a `cutRate` en la v0.10.

**Los avisos no bloquean.** Si el marcador chirría se dice, pero se deja guardar. En la mesa
pasan cosas raras de verdad: se gana por deck-out y por concesión sin llegar a 6 premios. Lo
único que se rechaza son los números fuera de 0–6, y eso lo hace la base con un CHECK.

**`resumenDeMargen()` descarta los juegos con penalización** y dice cuántos ha descartado. Un
6-0 que sale de una penalización no mide el emparejamiento, mide que alguien barajó mal. Se
cuentan aparte para que no parezca que se han perdido.

---

## Cómo deshacerlo

**El código:** `git revert HEAD`.

**La base:**

```sql
ALTER TABLE games DROP COLUMN IF EXISTS prizes_a, DROP COLUMN IF EXISTS prizes_b,
  DROP COLUMN IF EXISTS penalty_a, DROP COLUMN IF EXISTS penalty_b;
```

Si la migración llegó a retirar `prizes_left`, no la eches de menos: estaba vacía, por eso se
fue.

---

## Lo siguiente

1. **Lanza `npm run verificar:fase-a`** si no lo hiciste con la v0.29.0. Sigue siendo la
   comprobación que valida aquella versión.
2. **Usa los premios durante un par de semanas antes de construir nada encima.** Lo que decide
   si esto merece la pena no es el código: es si de verdad se rellena. Si en dos semanas hay
   marcador en la mayoría de los juegos, el paso 3 del documento 14 (margen de victoria en la
   matriz de emparejamientos y en la ficha de arquetipo) ya tiene datos de los que tirar.
3. **Turnos.** La columna `games.turns` sigue ahí sin interfaz. La dejé fuera a propósito: me
   pediste un apartado pequeño y meter un campo más por juego lo habría hecho más pesado justo
   en la pantalla que hay que rellenar deprisa. Es un campo numérico al lado de los mulligans
   cuando lo quieras.
4. **Fase B del rendimiento** (`docs/13-plan-rendimiento.md`), cuando toque.
