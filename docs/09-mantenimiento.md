# 09 · Mantenimiento

Lo que hay que hacer de vez en cuando para que esto siga funcionando dentro de dos años.

---

## Tareas periódicas

| Cada… | Qué |
|---|---|
| Semana de juego | Nada. Registrar partidas es todo. |
| Mes | Exportar una copia de la base de datos (5 minutos). |
| Mes | Un vistazo a *Ajustes → Invitaciones*: anular las que ya no hagan falta. |
| Rotación de Standard (~abril) | `npm run archetypes:sync` para traer los arquetipos nuevos. |
| Temporada de Play! Pokémon (julio) | Actualizar las tablas de CP en `src/lib/cp.ts` y cambiar la temporada en *Ajustes*. |
| Temporada vuestra | Crear la competición nueva y actualizar el nombre de temporada. |
| 3-6 meses | `npm outdated` y actualizar dependencias. |

---

## Actualizar las tablas de Championship Points

Es la tarea que más fácil se olvida y la que más se nota: si la tabla está desfasada, los CP que
enseña la aplicación no cuadran con los oficiales y deja de servir para nada.

**Cuándo.** La temporada de Play! Pokémon va **de julio a junio** y se nombra por el año en que
acaba: la que empieza en julio de 2027 es la temporada 2028. Las cifras se anuncian unas semanas
antes, así que junio es buen momento para mirar.

**Dónde.** En la mitad de abajo de `src/lib/cp.ts`, que es solo datos. La lógica de arriba no se
toca.

**Cómo.**

1. Busca las tablas oficiales en <https://championships.pokemon.com>, sección de cambios de la
   temporada. Es la fuente buena; las webs de noticias (PokéBeach, Bulbagarden, Cardsrealm) valen
   para contrastar cuando la oficial no es accesible.
2. Copia el bloque de la última temporada, renómbralo (`CP_2028`) y cambia:
   - `season`, `source` y, si procede, `note`.
   - Los `invites` por zona: cuántas invitaciones al Mundial reparte cada una. `null` si aún no
     se sabe.
   - Los `tiers` de cada tipo de evento: `from`, `to`, `cp` y `minPlayers`.
   - Los `bfl`: cuántos resultados de ese tipo cuentan (`0` = todos).
3. `confirmed: true` solo cuando las cifras sean oficiales. Con `false`, la aplicación avisa por
   su cuenta en *Torneos* y en la ficha de cada jugador de que son provisionales.
4. Añade la temporada a `SEASONS`, al final del fichero:

   ```ts
   const SEASONS: Record<number, CpSeason> = {
     2026: CP_2026,
     2027: CP_2027,
     2028: CP_2028,   // ← nuevo
   };
   ```

5. `npm test` — hay 13 pruebas que cubren el motor.
6. En *Ajustes → La liga*, cambia **Temporada de Championship Points** a la nueva. Es lo que
   decide qué tabla se usa para los totales que se enseñan.

> **Los torneos ya guardados no se tocan.** Cada resultado lleva sus CP en `cp_earned`, y los que
> no están marcados como manuales se recalculan al vuelo con la tabla de la temporada del torneo.
> Añadir 2028 no altera nada de 2027.

**El estado actual, a día de hoy:** 2026 está confirmada; **2027 está marcada como no confirmada**
y lleva los valores de 2026 como marcador de posición, porque se anunció que suben los CP de los
puestos bajos de Regional e International y que cambian los Best Finish Limit, pero las cifras
concretas no están publicadas en ningún sitio consultable. Corregirlas es cambiar números en ese
bloque y poner `confirmed: true`.

> **La aplicación no promete un corte de CP para el Mundial, y no es un olvido.** Desde 2025 la
> invitación se da por **Top N del ranking de la zona**, no por alcanzar un umbral, así que el
> corte solo se sabe cuando termina la temporada. Lo que sí se enseña es útil de verdad: tus CP,
> qué huecos de Best Finish Limit te quedan libres, y cuánto sumaría *realmente* un resultado
> hipotético — que muchas veces es cero, y eso es justo lo que interesa saber antes de coger un
> tren.

---

## Invitaciones y papeles

### Dar de alta a alguien

*Ajustes → Invitaciones → Nueva*. Tres decisiones: para quién es (una etiqueta, para acordarte),
cuántos usos admite y cuándo caduca. Se copia el enlace o se manda con el botón de compartir del
móvil, y quien lo abra crea su cuenta con su correo y su contraseña.

Lo sensato para el uso normal: **un uso y 14 días**. Un enlace sin límite y sin caducidad
reenviado a un grupo es, en la práctica, una liga abierta.

Si una invitación se va de las manos, **Anular** la deja inservible al momento sin tocar a quien
ya la usó.

> La primera invitación de todas, cuando aún no hay ninguna cuenta, se crea desde la terminal con
> `npm run invite`. A partir de ahí, siempre desde la web.

### Cerrar las altas del todo

En *Ajustes → La liga* hay una casilla, **Permitir altas nuevas con enlace de invitación**.
Desmarcarla bloquea todos los enlaces a la vez, incluidos los que ya están repartidos, sin tener
que anularlos uno a uno. Útil cuando el grupo ya está completo: se vuelve a marcar el día que
entre alguien.

### Cambiar el papel de alguien

*Ajustes → Jugadores*, con el desplegable de cada fila.

| Papel | Puede |
|---|---|
| **Jugador** | Lo suyo: sus mazos, sus partidas, sus torneos, su perfil |
| **Admin** | Además, la liga entera: invitaciones, competiciones, calendario, ajustes y las cosas de los demás |
| **Organizador** (`owner`) | Además, repartir y quitar el papel de organizador |

Tres cosas que la aplicación no deja hacer, y las comprueba en el servidor:

- Nadie se cambia el papel ni se desactiva **a sí mismo**. Evita quedarte fuera de tu propia liga.
- Un **admin no puede tocar a un organizador**, ni ascender a nadie a organizador. Si no, un admin
  podría ascender a un cómplice o degradar al dueño.
- **La liga nunca se queda sin ningún organizador activo.** Degradar o desactivar al último falla
  en silencio.

Conviene que haya **dos organizadores**. Si solo hay uno y pierde el acceso, hay que arreglarlo a
mano por SQL desde el panel de Neon:

```sql
UPDATE players SET role = 'owner', active = true WHERE email = 'quien@sea.com';
```

---

## Copias de seguridad

Neon guarda un historial reciente que permite restaurar a un punto anterior (*Branches →
Restore*), pero en el plan gratuito la ventana es corta. Una copia propia al mes cubre el
escenario que de verdad da miedo: que alguien borre algo sin querer y no se dé cuenta hasta
semanas después.

### Opción A — desde el panel de Neon

Panel de Neon → tu proyecto → **SQL Editor**, y ejecuta la consulta de exportación que quieras;
descarga el resultado en CSV. Rápido pero manual.

### Opción B — `pg_dump` (recomendada)

Si tienes las herramientas de PostgreSQL instaladas:

```bash
pg_dump "postgresql://…tu DATABASE_URL…" \
  --no-owner --no-acl \
  -f arena-2026-09-07.sql
```

Guarda ese fichero donde guardes las cosas importantes. Para restaurar:

```bash
psql "postgresql://…" -f arena-2026-09-07.sql
```

En Windows, `pg_dump` viene con el instalador de PostgreSQL
(<https://www.postgresql.org/download/windows/>); basta con la parte de *Command Line Tools*.

### Opción C — un script propio

Si prefieres un JSON legible, `loadSnapshot()` ya te da toda la liga:

```ts
// _export.ts en la raíz — bórralo después
import { config } from "dotenv";
config({ path: ".env.local" });
import { loadSnapshot } from "./src/lib/data";
import { writeFileSync } from "node:fs";

const snap = await loadSnapshot();
writeFileSync(`arena-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({
  config: snap.config,
  players: snap.players,
  archetypes: snap.archetypes,
  decks: snap.decks,
  competitions: snap.competitions,
  matches: snap.matches,
  events: snap.events,
}, null, 2));
console.log("Exportado.");
```

```bash
npx tsx _export.ts
```

> **La copia importante es la de la base de datos, no la del código.** El código está en GitHub y
> se puede volver a desplegar en diez minutos. El historial de partidas de tres temporadas no se
> recupera de ningún sitio.

---

## Empezar una temporada nueva

Hay dos maneras, según qué queráis que pase con el historial.

### A) Conservar todo (recomendada)

No borres nada. Crea una competición nueva y ya:

1. *Competiciones* → nueva, con las fechas de la temporada.
2. *Ajustes* → cambia el nombre de **Temporada**.
3. Cierra la competición vieja poniéndola en **Cerrada**.

El ranking por competición te da la clasificación de cada temporada por separado, el histórico
sigue completo, y el **Elo sigue creciendo sobre todo el historial**, que es lo que le da sentido
como medida de nivel a largo plazo.

### B) Empezar el ranking de cero

Si preferís que el Elo se reinicie, hay que borrar las partidas. Antes:

1. **Haz una copia** (arriba).
2. Borra las partidas desde el panel de Neon:

```sql
-- borra los juegos primero, o deja que el CASCADE lo haga
DELETE FROM games;
DELETE FROM matches;
```

Los jugadores, mazos, arquetipos y competiciones se mantienen.

> No hay un botón de "reiniciar temporada" en la interfaz a propósito: es una operación
> irreversible, y hacerla por SQL obliga a pararse a pensar.

---

## Migraciones del esquema

`npm run db:push` compara `src/db/schema.ts` con la base de datos y aplica las diferencias.
Enseña el SQL y pide confirmación.

**Es seguro para:** añadir tablas, añadir columnas nullable o con valor por defecto, añadir
índices.

**Cuidado con:** quitar columnas (se pierden los datos), cambiar tipos (puede fallar si los
datos existentes no encajan), añadir columnas `NOT NULL` sin `default` a tablas con filas
(fallará).

**Antes de un cambio grande:** copia de seguridad, y pruébalo primero contra una rama de Neon
(*Branches → New branch*), que es una copia de la base de datos que no toca la de producción.

Si prefieres migraciones versionadas en vez de `push`, drizzle-kit las soporta
(`drizzle-kit generate` + `drizzle-kit migrate`), y el directorio ya está configurado en
`drizzle.config.ts` (`out: "./drizzle"`). Para un proyecto de dos personas, `push` es suficiente.

---

## Actualizar dependencias

```bash
npm outdated
```

**Parches y versiones menores** (15.5.0 → 15.5.4, 15.5 → 15.6) suelen ser seguros:

```bash
npm update
npm run build     # comprueba
```

**Versiones mayores** (Next 15 → 16, React 19 → 20) piden leer las notas de la versión. No hay
prisa: una versión mayor por detrás no rompe nada y sigue recibiendo parches durante meses.

Después de cualquier actualización: `npm run build`, arranca en local, entra, registra una
partida de prueba y bórrala. Si todo va, `git push`.

---

## Rotación de Standard

Cada primavera rota el formato Standard y el metagame cambia entero.

```bash
npm run archetypes:sync
```

Trae los arquetipos nuevos de Limitless sin tocar los que ya tengáis. Luego, en *Mazos →
Arquetipos*, repasa los tipos de energía de los nuevos (llegan como "incoloro").

Los arquetipos viejos **no se borran**, y está bien así: las partidas de temporadas anteriores
los siguen referenciando y sus estadísticas siguen siendo válidas.

---

## Qué hacer si alguien se va del grupo

*Ajustes → Jugadores → Editar →* desmarca **Activo en el ranking**.

Desaparece del ranking y de los desplegables, pero sus partidas siguen contando para las
estadísticas generales y para el historial de los demás. Si intentas borrarlo teniendo partidas,
la aplicación lo desactiva en vez de borrarlo, precisamente para no dejar el historial huérfano.

---

## Si el proyecto se abandona un año

No pasa nada:

- **GitHub** conserva el código indefinidamente.
- **Neon** no borra proyectos del plan gratuito por inactividad; solo apaga el cómputo.
- **Vercel** mantiene el despliegue.

Al volver: `git pull`, `npm install`, `npm run dev`. Probablemente toque actualizar dependencias,
y la primera visita a la web tardará un par de segundos mientras Neon despierta.

---

## Checklist antes de un cambio importante

- [ ] Copia de seguridad de la base de datos hecha
- [ ] `git pull` y todo commiteado
- [ ] `npm run build` pasa
- [ ] Probado en local: entrar, registrar una partida, verla en el ranking
- [ ] Si toca el esquema, probado antes contra una rama de Neon
- [ ] Avisada la otra persona
