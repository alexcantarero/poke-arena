# Cómo meter la v0.5.0 en `develop`

El zip trae **solo los ficheros que cambian**, con la misma estructura del proyecto.
Descomprímelo encima de tu copia y sobrescribe.

```bash
git checkout develop
git pull
unzip -o arena-v0.5.0-cambios.zip -d .
git status          # tienen que salir 18 ficheros: 11 modificados y 7 nuevos
git diff --stat
```

Si sale alguno más, párate y mira qué es antes de seguir.

**Los 7 nuevos:**

```
drizzle/0003_v0_5_0.sql
docs/02-manual-usuario-apendice-v0.5.0.md
README-v0.5.0-apendice.md
src/components/Snackbar.tsx
src/lib/flash.ts
tests/v0_5_0.test.ts
IMPLEMENTAR-v0.5.0.md
```

**Ojo con dos de ellos:** `README-v0.5.0-apendice.md` y
`docs/02-manual-usuario-apendice-v0.5.0.md` **no son el README ni el manual reales** — no
los tenía en este paquete de cambios (solo viajan ficheros tocados, y esos dos no lo
estaban), así que son apéndices con lo que habría que insertar a mano en cada uno. Léelos,
pega lo que corresponda donde corresponda, y borra el fichero de apéndice cuando termines.
Si me subes el README y el manual reales la próxima vez, los fusiono directamente.

---

## 1. La base de datos

Dos pasos, en este orden.

```bash
npm run db:push
```

Eso crea, leyendo el esquema de Drizzle: `tournaments.start_time`, `tournaments.entry_fee_cents`
y `matches.archetype_a_id`.

Después, pega **`drizzle/0003_v0_5_0.sql` entero** en el SQL Editor de Neon. Es idempotente.
Lo que hay ahí y no sale del esquema de Drizzle:

- Los `CHECK` de `start_time` (formato `HH:MM`) y `entry_fee_cents` (no negativo).
- La migración de datos: los torneos con `kind = 'pokemon_challenge'` o `'pokemon_cup'` pasan
  a `league_challenge`/`league_cup`. Es la parte que de verdad importa correr: sin ella, un
  torneo viejo con ese tipo se queda con un valor que ya no aparece en el desplegable de
  edición (seguiría funcionando —el motor de CP lo sigue reconociendo como alias—, pero
  editarlo mostraría el selector en blanco hasta que eligieras uno de los dos nuevos).

Al final del fichero hay tres comprobaciones comentadas. Descoméntalas y ejecútalas.

**Nada se pierde.** Los torneos que ya existen quedan con `start_time` y `entry_fee_cents`
en blanco, que es lo mismo que no saberlo.

---

## 2. Compilar

```bash
npm test        # 29 pruebas (18 de antes + 11 nuevas de esta versión)
npm run build
npm run dev
```

Las 11 nuevas están en `tests/v0_5_0.test.ts` y prueban, sin tocar la base de datos:
`roundStage()` (suizo vs. las fases del top cut), `metaShare()`, `performanceByRoundNumber()`,
y que un juego marcado como empate resuelve la ronda igual con o sin desglose completo. Las he
corrido aquí mismo con `node --experimental-strip-types --test` y las 29 pasan.

Sigue en pie el aviso de siempre: **este proyecto no se ha compilado nunca aquí** (npm está
bloqueado en el entorno donde se escribe), así que `npm run build` es la primera vez que
Next.js ve estos ficheros de verdad. Si saca algo, pásamelo y lo miro.

---

## 3. Qué probar en el navegador, y en este orden

1. **El bug de renumerar una ronda.** Apunta la ronda 1 y la ronda 2 de un torneo abierto.
   Edita la ronda 2 y cámbiale el número a 1. Antes esto reventaba con un error de servidor;
   ahora las dos rondas tienen que **intercambiarse**: la que era ronda 2 pasa a ser la 1, y
   la que era la 1 pasa a ser la 2.
2. **El empate a mitad de un juego a juego.** Registra una ronda en modo "Juego a juego" con
   el mazo del torneo ya fijado. Marca el Juego 1 como ganado. Marca el Juego 2 como
   **Empate**. El Juego 3 tiene que **desaparecer solo**, sin marcar "se acabó el tiempo", y
   el mensaje de abajo tiene que decir que la ronda queda ganada 1–0. Guarda y comprueba que
   el récord de arriba sube en consecuencia.
3. **Mazo del torneo solo por arquetipo.** Crea un torneo nuevo. En la primera ronda, en "Con
   qué mazo juegas el torneo", busca y elige un **arquetipo** (no un mazo con lista). Guarda.
   Apunta la ronda 2: tiene que salir ya fijado el arquetipo, sin volver a preguntarlo, igual
   que pasaba con un mazo de verdad.
4. **Hora y precio.** En `/torneos/nuevo`, pon una hora de inicio y un precio (por ejemplo
   `5`). Guarda y comprueba que la ficha del torneo los enseña en la cabecera, junto a la
   fecha.
5. **League Cup / Pokémon Cup.** En el desplegable de "Tipo" al crear un torneo, comprueba que
   ya **no** salen "Pokémon Cup" ni "Pokémon Challenge" — solo "League Cup" y "League
   Challenge". Si tenías algún torneo viejo con esos tipos, ábrelo y comprueba que ahora
   aparece como su equivalente.
6. **Fase de la ronda.** En un torneo con "Rondas" y "Top cut" puestos (por ejemplo 5 y 8),
   apunta rondas hasta pasar de la 5.ª: la 6.ª tiene que llevar la etiqueta **Cuartos**, la
   7.ª **Semifinal**, la 8.ª **Final**.
7. **Snackbar.** Crea un torneo, edítalo, ciérralo y bórralo (uno de prueba, no el que estés
   usando de verdad): en cada paso tiene que aparecer el aviso abajo, y desaparecer solo a los
   pocos segundos o al tocar la ×.
8. **Perfil.** Entra en tu perfil y comprueba el orden: evolución del Elo y mazos primero,
   luego enfrentamientos directos y emparejamientos, y el desglose de CP **después** de todo
   eso, no antes.

---

## 4. Extender el snackbar al resto de acciones

Esta versión lo deja enganchado en `saveTournament`, `setTournamentStatus`, `deleteTournament`,
`saveTournamentRound` y `deleteTournamentRound`. El resto de acciones (mazos, ajustes,
partidas sueltas, competiciones…) se quedan como estaban — no las he tocado porque no venían
en el paquete de cambios que tengo y no quería editarlas sin verlas.

El patrón para añadir feedback a cualquier otra es mecánico:

```ts
import { withFlash } from "@/lib/flash";

// antes:
redirect(`/mazos/${id}`);

// después:
redirect(withFlash(`/mazos/${id}`, "ok", "Mazo guardado."));
```

Y para un error que hoy simplemente hace `return` en silencio, si quieres que también avise:
cambia el `return` por `redirect(withFlash(back, "error", "No se ha podido guardar."))` con la
ruta a la que tendría sentido volver. El snackbar ya distingue los dos tipos por color e icono.

Falta un paso, y es tuyo: el componente `<Snackbar />` hay que montarlo una vez en el layout
raíz, dentro de un `<Suspense>` (lo exige `useSearchParams`):

```tsx
import { Suspense } from "react";
import { Snackbar } from "@/components/Snackbar";
// ...dentro del <body>, donde tenga sentido que flote encima de todo:
<Suspense fallback={null}><Snackbar /></Suspense>
```

No he tocado `layout.tsx` porque tampoco venía en el paquete de cambios: no quería editarlo a
ciegas y arriesgarme a machacar algo que ya tuvieras ahí.

---

## 5. Lo que sé que sigue pendiente

Para que no te pille de sorpresa:

- **Day 1 / day 2 / asimétrico**: `roundStage()` solo distingue suizo de top cut. Un
  Regional con corte de asistencia a mitad del suizo (day 1 → day 2) sigue etiquetando todo
  lo que no es top cut como "Suizo" sin más. Separarlo de verdad pide un campo nuevo —algo
  como `tournaments.day1_rounds`— y no lo he metido para no adivinar un modelo de datos que
  no me habías confirmado. Se puede seguir apuntando esas rondas sin ningún problema.
- **El cuadro del top cut no se dibuja.** Esta versión pone el nombre de la fase (Cuartos,
  Semifinal, Final) junto al número de ronda, pero no hay un cuadro visual con las llaves.
  Es el siguiente paso natural si quieres seguir por aquí.
- **Filtrar Resultados por torneo, y los filtros de fecha/tipo en Estadísticas**: no los he
  tocado. Esas pantallas (`/resultados`, `/estadisticas`) no vienen en ningún paquete de
  cambios que tenga — la primera vez que las vea puedo aplicarlo.
- **README y manual de usuario**: van como apéndices para pegar a mano (puntos de arriba),
  no como ficheros completos, por el mismo motivo: no los tengo.
- Sigue en pie lo de siempre: **el proyecto no se ha compilado nunca en el entorno donde se
  escribe** (npm bloqueado). Se verifica con 29 pruebas del motor de CP y de estadísticas, un
  comprobador de sintaxis con `tsc` sobre todo `src/` (sin `node_modules`, así que solo
  detecta errores de sintaxis de verdad, no de tipos) y revisión de código. El `npm run
  build` real puede sacar cosas.
