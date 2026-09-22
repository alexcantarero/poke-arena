# Cómo meter la v0.9.0 en `develop`

> **Acumulativo: incluye la v0.7.0 y la v0.8.0.** Si no habías aplicado los zips anteriores,
> aplica solo este. Si sí, descomprime encima: lo que se repite es idéntico.

> **Toca la base de datos**, y ahora son dos migraciones si vienes de la v0.6.0: una columna
> y una tabla de la v0.8.0, y cuatro columnas de `events` de la v0.9.0. `npm run db:push`
> hace las dos de una vez.

```bash
git checkout develop
git pull
unzip -o arena-v0.9.0-cambios.zip -d .
git rm README-v0.5.0-apendice.md      # su contenido está ya dentro del README
npm run db:push                        # ESTO ANTES DE DESPLEGAR
npm test                               # 118 pruebas
npm run build
```

---

## 1. El problema de los CP: qué pasaba de verdad

Tu diagnóstico y la solución que traías iban en la dirección correcta, pero la causa era
otra, y conviene contarla porque cambia el arreglo.

**El recálculo ya existía.** `saveTournament` ya rehacía los CP de todos los resultados al
editar un torneo, saltándose los puestos a mano. O sea que el «Caso 2» de tu propuesta estaba
implementado desde la v0.4.0.

**Lo que fallaba era la lectura.** Tres pantallas —la lista de torneos, la ficha y el perfil—
leían la columna `cp_earned` **en crudo**. Esa columna es una caché que se rellena al
guardar, y el perfil, que sí recalculaba con `computeCp`, decía otra cosa. Cualquier
diferencia entre las dos salía como «el ranking dice una cifra y el torneo otra».

**El arreglo.** Hay un `effectiveCp()` nuevo en `src/lib/cp.ts` y **ninguna pantalla lee ya la
columna**: se calcula del tipo, el puesto y la asistencia de ahora mismo. Así el bug no puede
volver por otro camino. La columna sigue ahí porque es lo que guarda los valores puestos a
mano y lo que se exportaría, pero ya no decide lo que ves.

Sobre tu propuesta concreta: el `revalidatePath` que planteabas ya lo hace `refresh()`, que
invalida el layout entero. No hacía falta añadirlo.

### Y lo que sí faltaba: el sitio donde ponerla

El campo de asistencia estaba en el formulario de editar, entre otros veinte. Por eso no se
rellenaba. Ahora hay un panel en **la propia ficha del torneo** con tres campos —gente,
rondas suizas, top cut— y un botón que guarda y recalcula.

Lo que de verdad cambia el comportamiento es lo que sale encima:

> **Ibai se está dejando 6 CP.** Los tramos bajos solo puntúan a partir de cierta asistencia…
> · Ibai · 15.º puesto · `0 → 6 CP` · con 25+ jugadores

Un aviso que dice «falta la asistencia» se ignora. Uno que dice cuántos puntos estás
perdiendo, no. Y cuando está todo bien, **el panel no se pinta**: que desaparezca es la señal.

---

## 2. El orden de los torneos

Antes salía el más nuevo arriba. Ahora es orden de agenda: **primero lo que está por jugar,
del más cercano al más lejano; detrás lo ya jugado, del más reciente al más antiguo.** Lo de
hoy va lo primero de todo.

Cada fila lleva además «en 3 días» / «hace 2 semanas», que con este orden es lo que la sitúa,
y la cabecera dice cuántos hay por delante.

El comparador es `byAgenda(hoy)` en `src/lib/format.ts`. Recibe la fecha de hoy como
argumento en vez de leer el reloj, para poder probarlo — hay cuatro pruebas.

---

## 3. El calendario

**Color por tipo.** Mundial, Internacional, Regional, Special Event, League Cup, League
Challenge, tienda, online. Los colores salen de la paleta de series de `globals.css`, que ya
está validada para daltonismo y tiene versión clara y oscura; cambiar `--series-2` cambia el
calendario con él. El mapa está en `src/lib/calendar.ts`.

**Filtro por tipo**, por URL como el resto de la app. Solo aparecen los tipos que de verdad
hay en tus datos.

**Eventos de varios días.** Un Regional es sábado y domingo y ahora ocupa los dos.

### Los oficiales de Europa

Botón en el calendario, visible para organizadores: **Importar eventos de Europa**. Mete los
diez de la temporada 2027.

| Fecha | Evento | Dónde |
|---|---|---|
| 26–27 sep 2026 | Regional | Frankfurt |
| 17–18 oct 2026 | Regional | Niza |
| 31 oct – 1 nov 2026 | Regional | Gdansk |
| 28–29 nov 2026 | Regional | Stuttgart |
| 30–31 ene 2027 | Regional | Birmingham |
| **19–21 feb 2027** | **Internacional (EUIC)** | **Londres** — *fecha por confirmar* |
| 10–11 abr 2027 | Special Event | Lisboa |
| 8–9 may 2027 | Regional | Praga |
| 22–23 may 2027 | Regional | Utrecht |
| 5–6 jun 2027 | Special Event | Bolonia |

**De dónde salen y hasta qué punto fiarse.** Consultado el 21/09/2026 en Serebii, en el
anuncio de PokéBeach de julio de 2026 y en championships.pokemon.com. La web oficial se pinta
con JavaScript, así que de ella solo se ha podido confirmar **qué eventos existen**, no sus
fechas.

Donde las fuentes no coinciden, lo digo en vez de elegir en silencio:

- **El Internacional.** Serebii dice 19–21 de febrero; PokéBeach dice 13–15. El 13–15 de
  febrero es exactamente la fecha del Internacional de **2026**, así que huele a arrastre del
  año anterior y he puesto la de Serebii. Va marcado en el calendario como «fecha por
  confirmar». **Compruébalo antes de sacar vuelos.**
- **Noviembre de 2026.** PokéBeach lo lee como un Regional en Bolonia; Serebii, como
  Stuttgart, y deja Bolonia en junio como Special Event. Que la web oficial tenga ficha de
  «2027 Stuttgart Regional Championships» inclina la balanza hacia Serebii.

**No se raspa ninguna web.** La lista está escrita a mano en `src/data/eventos-europa.ts` con
las fuentes al lado. Para diez eventos al año no hace falta automatizar nada, y con las webs
de las que salen no sería correcto. Para actualizarla: editas el fichero y vuelves a pulsar
el botón. Es idempotente —cada evento lleva un id fijo—, así que actualiza en vez de
duplicar.

---

## 4. Ficheros

### Nuevos

| Fichero | Qué es |
|---|---|
| `src/lib/calendar.ts` | Los colores del calendario, uno por tipo. |
| `src/data/eventos-europa.ts` | La lista de eventos oficiales, con sus fuentes. |
| `src/components/AttendanceForm.tsx` | El panel de asistencia de la ficha del torneo. |
| `drizzle/0005_v0_9_0.sql` | La migración del calendario. |

### Modificados, y qué les pasa

| Fichero | Qué le ha pasado |
|---|---|
| `src/lib/cp.ts` | `effectiveCp()` y `explainCp()`. |
| `src/lib/format.ts` | `byAgenda()`. |
| `src/actions/index.ts` | `recalcTournamentCp()` extraído, `setTournamentAttendance()`, `importEuropeanEvents()`, y `saveEvent` con los campos nuevos. |
| `src/db/schema.ts` | Cuatro columnas en `events`. |
| `src/app/(app)/calendario/page.tsx` | Reescrita: color, filtro, varios días, agenda con torneos. |
| `src/components/EventForm.tsx` | Tipo de torneo, fecha final, sitio y enlace. |
| `src/app/(app)/torneos/page.tsx` | Orden de agenda y CP calculados. |
| `src/app/(app)/torneos/[id]/page.tsx` | Panel de asistencia y CP calculados. |
| `src/app/(app)/perfil/[id]/page.tsx` | CP calculados. |
| `tests/cp.test.ts`, `tests/cut.test.ts` | 12 pruebas nuevas. |

---

## 5. Qué probar, y en este orden

1. **El torneo de los 6 CP.** Ábrelo. Si le falta la asistencia, arriba tiene que salir el
   aviso en dorado con tu nombre y el `0 → 6 CP`. Escribe cuánta gente hubo, guarda: el aviso
   desaparece y los 6 CP salen en la ficha, en la lista de torneos y en tu perfil, los tres a
   la vez. Si no desaparece, dime qué pone.
2. **Que no se pueda desincronizar.** Cambia la asistencia a una cifra por debajo del kicker
   (por ejemplo 20). Los CP tienen que volver a 0 en las tres pantallas, y el panel vuelve a
   salir explicando que hacen falta 25.
3. **Un CP a mano.** Si tienes alguno con asterisco, comprueba que no se mueve al cambiar la
   asistencia. Eso es deliberado.
4. **Torneos.** La lista tiene que empezar por Frankfurt (26 de septiembre, en 5 días) y no
   por el último que jugasteis.
5. **Calendario.** Pulsa «Importar eventos de Europa». Ve a octubre: Niza el 17–18 y Gdansk
   el 31, en naranja, y Gdansk ocupando también el 1 de noviembre. Filtra por «Regional»:
   desaparecen las partidas y las jornadas. Comparte la URL y compruébalo.
6. **Febrero de 2027.** El Internacional sale en morado y con la nota de fecha por confirmar.

---

## 6. Lo que sigue pendiente

- **City Leagues de Japón** en Top Decks.
- **Heat map** como rejilla de colores: con los arquetipos actuales serían casi todo huecos.
- **Filtro por región** del meta mundial: no existe en la API de Limitless.
- `loadSnapshot()` sigue cargando la base entera en cada petición. Con dos temporadas encima
  habrá que paginar Resultados y cachear el snapshot.
