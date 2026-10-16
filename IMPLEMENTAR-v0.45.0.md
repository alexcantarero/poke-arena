# PokeArena TCG v0.45.0 — estructura de torneo, cierre automático y series online

Va sobre la **v0.44.0**. **Lleva migración de base de datos.** Sin dependencias nuevas.

## Paso 1 — Descomprime

| | Fichero |
|---|---|
| M | `package.json`, `CHANGELOG.md` |
| M | `src/db/schema.ts` |
| M | `src/lib/estructura.ts` ← **la fuente única de las fases** |
| M | `src/components/TournamentForm.tsx` ← bloque «Estructura» |
| M | `src/components/CaminoAlCorte.tsx`, `src/app/(app)/torneos/[id]/page.tsx` |
| M | `src/lib/limpieza.ts`, `src/lib/limpiezaDb.ts`, `src/app/api/cron/limpieza/route.ts` |
| M | `src/lib/seriesOnline.ts`, `src/lib/seriesOnlineDb.ts` |
| M | `src/actions/index.ts`, `src/app/(app)/ajustes/page.tsx` |
| U | `drizzle/0018_v0_45_0.sql` |
| U | `src/data/seriesSeguidas.ts` |
| U | `tests/fasePropia.test.ts`, `tests/cierreTorneos.test.ts` |
| M | `tests/seriesOnline.test.ts` |

## Paso 2 — Borra la guía ya aplicada

```bash
git rm IMPLEMENTAR-v0.44.0.md
```

## Paso 3 — La migración

En el SQL Editor de Neon, **primero en la rama `dev`**. Es idempotente.

```sql
-- drizzle/0018_v0_45_0.sql
```

Añade una columna que puede quedar vacía: no cambia ni un dato de los que ya hay.

## Paso 4 — Verifica

```bash
npm run verificar   # 511 de 511
npm run build
npm run dev
```

## Paso 5 — Pruébalo

**Crear un torneo como el Moujii's Dojo de tu captura**
1. Torneos → Nuevo. Tipo online.
2. En «Estructura»: fase 1 con **+** hasta **8**. Pulsa **«+ Segunda fase suiza»** y deja **3**.
   Top cut: **Top 8**. Arriba debe poner «8 + 3 rondas suizas · top 8».
3. Guarda y entra en el torneo. El camino al corte tiene que tener las pestañas **Fase 1** y
   **Fase 2 y corte**. Al apuntar la ronda 9, debe salir marcada como «Fase 2»; y de la 12 en
   adelante, como eliminatoria.
4. Edítalo: tienen que volver a salir 8 y 3, no 11.

**Un Regional, para ver que no cambia nada**
5. Crea uno de tipo Regional: el botón de segunda fase **no sale**, y en su lugar dice que el
   Día 1 y el Día 2 los pone el reglamento. Esos se siguen llamando «Día 1» y «Día 2».

**Cierre automático**
6. Ajustes → «Limpiar ahora». El aviso dice ahora cuántos ha borrado (vacíos) y cuántos ha
   cerrado (en curso, con datos, de hace más de una semana).

**Series online**
7. Ajustes → «Torneos online previstos» → Buscar ahora. Entre lo encontrado deberían estar
   Crown of Spain y Mouji's Dojo. En el calendario, filtro «Online».

---

## Lo que he hecho, y por qué así

### Una sola fuente para las fases

Antes de tocar el formulario encontré que la división en fases se calculaba en **tres sitios**:
la ficha del torneo (con `formaDe`), el camino al corte (con su propia cuenta desde la tabla
oficial) y `roundStage`. Los tres salían de la tabla del reglamento, así que un online con su
propia estructura no se podía describir.

Lo he dejado en uno: `formaDe()` aprende la segunda fase tecleada, que **manda sobre la tabla**
igual que ya mandaban las rondas y el corte, y el camino al corte deja de ir por libre. El
tercero, `roundStage`, resulta que vive en un componente (`TournamentRounds`) que **no se pinta
en ningún sitio**: es código muerto, y lo dejo apuntado para retirarlo.

**`rounds` sigue siendo el total de rondas suizas.** La columna nueva solo dice cuántas son de la
fase 2. Así ninguna otra pantalla cambia: los CP, «te faltan N rondas» y las estadísticas siguen
leyendo lo mismo.

### El formulario

Tenías el número de rondas suelto y el tamaño del corte escondido dentro de «Más detalles». Ahora
las tres cosas están juntas, a la vista, con un resumen arriba que dice cómo queda el torneo.

Botones de **más y menos** en lugar de teclear: desde el móvil, tocar «+» tres veces es más
rápido y más difícil de equivocar que abrir el teclado numérico, borrar y escribir. El número
sigue siendo editable a mano.

La segunda fase solo se ofrece donde no hay tabla oficial. En un Regional el reglamento ya pone
el Día 1 y el Día 2, y dejar teclearlos invitaría a equivocarse.

### El cierre de torneos

Pediste dos reglas:

- **Con datos y en curso, a la semana: se cierran.** Es nuevo. Lo hace el cron de cada noche y
  el botón «Limpiar ahora», y hace exactamente lo mismo que el botón «Cerrar» de la ficha. No
  toca los borradores: un borrador con fecha pasada no es un torneo olvidado, es uno que no se
  llegó a empezar.
- **Sin participación, a los tres días de pasada la fecha.** Esto **ya existía desde la v0.19**,
  y hace eso exactamente. Una diferencia: pediste que «se cierren», y lo que hace es
  **borrarlos**, porque así lo pediste en su día («si pasados 3 días nadie imputa resultados se
  borra»). Un torneo vacío cerrado sería un torneo sin nada dentro ocupando el calendario. **Si
  prefieres que se cierren y no se borren, dímelo**: es cambiar una línea.

### Las series online

Tres cambios en la detección:

- **Crown of Spain y Mouji's Dojo entran siempre**, con solo dos ediciones y sin mínimo de
  jugadores. Están en `src/data/seriesSeguidas.ts`, y añadir otra es una línea. La comparación
  ignora mayúsculas, acentos, espacios y símbolos, así que «🏆 Moujii's Dojo 🏆» encaja con
  «mouji».
- **Las series más frecuentes ya no se descartan.** Antes se exigían de 6 a 8 días entre
  ediciones, así que una serie diaria se tiraba justo por jugarse más.
- **Varias franjas por semana.** Una serie de martes y sábados se preveía solo en sábado, porque
  solo se miraba la última edición. Ahora cada día en que se juega, con un tope de siete fechas
  por serie para que una diaria no llene el calendario.

Sigue valiendo lo de la v0.44: son **previsiones**, porque la API de Limitless solo da torneos
ya jugados.

## Lo que no he hecho, y te propongo

**Los umbrales de paso de fase.** Tu captura dice «16 puntos o top 8 pasan a la fase 2» y «24
puntos (máximo 8) o top 8 pasan al corte». Con una estructura propia, el camino al corte ya sabe
cuántas rondas tiene cada fase, pero **no sabe esos umbrales**: los oficiales salen de la tabla
del reglamento, y los de un online los pone su organizador. Se pueden añadir como dos campos más
en «Estructura» («puntos para pasar a la fase 2», «puntos para el corte»), y entonces el camino
al corte te diría «te faltan 2 victorias para la fase 2». Es una columna más en la base; dime si
lo quieres.

## Cómo deshacerlo

```bash
git revert HEAD
```

```sql
ALTER TABLE tournaments DROP CONSTRAINT IF EXISTS tournaments_rounds_phase2_rango;
ALTER TABLE tournaments DROP COLUMN IF EXISTS rounds_phase2;
```

Los torneos que el cron haya cerrado se quedan cerrados: se pueden reabrir desde su ficha.
