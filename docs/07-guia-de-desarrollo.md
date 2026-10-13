# 07 · Guía de desarrollo

Recetas concretas para modificar Arena. Cada una dice qué ficheros tocar, en qué orden, y cómo
comprobar que ha salido bien.

**Índice**

- [Antes de tocar nada](#antes-de-tocar-nada)
- [Los comandos que hay](#los-comandos-que-hay)
- [Dos reglas de seguridad que no se negocian](#dos-reglas-de-seguridad-que-no-se-negocian)
- [Los estilos: Tailwind v4 configurado desde CSS](#los-estilos-tailwind-v4-configurado-desde-css)
- [Cambiar una fórmula](#cambiar-una-fórmula)
- [Añadir un campo a una tabla](#añadir-un-campo-a-una-tabla)
- [Añadir una pantalla](#añadir-una-pantalla)
- [Añadir una acción que escriba en la base](#añadir-una-acción-que-escriba-en-la-base)
- [Añadir una estadística](#añadir-una-estadística)
- [Tocar el motor de Championship Points](#tocar-el-motor-de-championship-points)
- [Cambiar el sistema de acceso](#cambiar-el-sistema-de-acceso)
- [Convenciones del proyecto](#convenciones-del-proyecto)
- [Las pruebas](#las-pruebas)
- [Probar sin levantar la aplicación](#probar-sin-levantar-la-aplicación)
- [Pedir cambios a un asistente de código](#pedir-cambios-a-un-asistente-de-código)

---

## Antes de tocar nada

```bash
git pull
npm install        # solo si el pull tocó package.json
npm run dev
```

Deja `npm run dev` corriendo en una terminal: recarga solo al guardar. En otra terminal haces
git y todo lo demás.

Y antes de subir:

```bash
npm run build
npm test
```

`build` es exactamente lo que ejecuta Vercel: si pasa aquí, el despliegue va a funcionar.

> **No hay `npm run lint`.** Se quitó a propósito: en un proyecto de dos personas el linter se
> convertía en un paso más que nadie ejecutaba, y TypeScript en modo estricto ya atrapa lo que de
> verdad rompe. Lo que hay que pasar antes de subir es `npm run build` y `npm test`.

---

## Los comandos que hay

Están todos en `package.json`, y son estos:

| Comando | Qué hace |
|---|---|
| `npm run dev` | Arranca en local con recarga en caliente, en <http://localhost:3000> |
| `npm run build` | Compila para producción. Lo mismo que ejecuta Vercel |
| `npm start` | Sirve lo compilado. Solo para probar el build en local |
| `npm run db:push` | Aplica `src/db/schema.ts` a Neon `dev` configurada en `.env.local`; nunca lo uses para producción |
| `npm run db:studio` | Explorador visual de la base de datos |
| `npm run db:seed` | Rellena Neon `dev` con datos de ejemplo. **Borra lo que haya** (`-- --empty` para dejarla en limpio); nunca lo ejecutes en producción |
| `npm run archetypes:sync` | Trae los arquetipos nuevos de Limitless |
| `npm test` | Las pruebas del motor de CP |
| `npm run invite` | Crea un enlace de invitación desde la terminal |

---

## Dos reglas de seguridad que no se negocian

Las dos vienen de fallos reales que ya se han corregido. Son las que hay que tener en la cabeza
al escribir cualquier pantalla o cualquier acción nueva.

### 1. Del servidor no sale nada que no deba verse

Un Server Component puede leer lo que quiera de la base de datos. Lo que no puede es **pasárselo
a un componente cliente**: Next serializa todas las props que cruzan esa frontera y las escribe
en el HTML de la respuesta. Ahí las lee cualquiera con *ver código fuente*.

Por eso las páginas no cargan filas completas de `players`. Cargan la proyección
`PUBLIC_PLAYER_COLUMNS`, en `src/lib/data.ts`, que deja fuera `email` y `password_hash`:

```ts
export const PUBLIC_PLAYER_COLUMNS = {
  id: players.id,
  name: players.name,
  role: players.role,
  // … el resto de columnas públicas …
} satisfies Record<keyof PublicPlayer, unknown>;
```

Y el tipo que la sostiene, en `src/lib/types.ts`:

```ts
export type PublicPlayer = Omit<Player, "email" | "passwordHash">;
```

**El `satisfies` es el candado.** Obliga a que el objeto tenga exactamente las claves de
`PublicPlayer`: ni una menos —te olvidas de `bio` y no compila— ni una más —añades `email` y
tampoco compila. Sin él, meter el correo en la proyección sería un cambio de una línea que
compila, pasa el build y empieza a publicar correos y hashes en el HTML de todas las páginas sin
que nadie se entere.

Reglas prácticas:

- El snapshot que devuelve `loadSnapshot()` **solo lleva `PublicPlayer`**. Si tu pantalla necesita
  un jugador, es ese tipo.
- Si de verdad hace falta un dato sensible en una pantalla concreta —los correos en el panel de
  organizador, por ejemplo— se pide con un `select` explícito allí donde se usa, como hace
  `loadPlayerEmails()`, y se comprueba antes que quien mira tiene permiso. Así el dato viaja en
  una página, no en todas.
- Al añadir una columna a `players`, decide en qué lado va. Si es pública, añádela a
  `PUBLIC_PLAYER_COLUMNS`; si no, no la toques y el `satisfies` no te dejará equivocarte, porque
  `PublicPlayer` la incluirá automáticamente y el compilador pedirá que esté. Para una columna
  secreta, añádela a la lista del `Omit` en `PublicPlayer`.

### 2. Los permisos se comprueban dentro de la acción

**Una Server Action es un endpoint público.** Está expuesta en una URL y cualquiera con sesión
puede invocarla con el `FormData` que le dé la gana, desde la consola del navegador o con `curl`.
Que la interfaz esconda el botón no protege absolutamente nada: solo evita que se pulse sin
querer.

Por eso toda acción de `src/actions/index.ts` empieza resolviendo quién actúa y qué puede hacer:

```ts
const actor = await requireActor();     // hay sesión válida y la cuenta sigue activa
const actor = await requireManager();   // además es owner o admin
```

Y cuando la acción toca algo que pertenece a alguien, **el dueño se lee de la fila guardada, no
del formulario**:

```ts
const current = (await db.select().from(decks).where(eq(decks.id, editing)))[0];
if (!current || !owns(actor, current.playerId)) return;
```

Fiarse del `playerId` que venía en el `FormData` era el fallo: mandando el id de un mazo ajeno te
lo apropiabas. Lo mismo vale para las partidas —solo registras las tuyas, salvo que seas
organizador— y para los resultados de torneo.

**Y lo que llega en el `FormData` es texto de fuera.** Se valida antes de tocar una columna, con
los ayudantes que ya están en el fichero:

| Ayudante | Para qué |
|---|---|
| `str(fd, k)` | Texto, ya recortado. Casi siempre con un `.slice(n)` detrás |
| `int(fd, k, dflt, min, max)` | Entero acotado. Para toda columna `integer` |
| `maybeInt(fd, k, min, max)` | Igual, pero puede faltar y entonces es `null` |
| `isoDate(fd, k, dflt)` | Fecha `YYYY-MM-DD` validada. Una cadena rara reventaba la consulta con un 500 |
| `pick(fd, k, allowed, dflt)` | Lista cerrada: si el valor no está, se usa el de por defecto |
| `bool(fd, k)` | Casilla marcada |

Un detalle que parece tontería y no lo es: `num()` distingue "campo vacío" de "campo a cero".
`fd.get(k)` devuelve `null` cuando el campo no viene y `Number(null)` es `0`, que es un número
perfectamente finito — con la versión ingenua, un formulario incompleto ponía `maxUses` a 0, que
significa *invitación ilimitada*.

Al añadir un campo nuevo: si acaba en una columna `integer`, pasa por `int` o `maybeInt`; si es
una fecha, por `isoDate`; si es un enumerado, por `pick` con la lista literal. Nunca directamente
de `fd.get()` a la columna.

---

## Los estilos: Tailwind v4 configurado desde CSS

El proyecto usa **Tailwind CSS v4**, y en v4 la configuración ya no vive en un
`tailwind.config.js` — ese fichero **no existe aquí y no hay que crearlo**. Todo se declara desde
CSS, en **`src/app/globals.css`**, que empieza con un `@import "tailwindcss"`. Lo único que hay
fuera es `postcss.config.mjs`, con el plugin `@tailwindcss/postcss` y nada más.

El fichero está montado en cuatro capas, en este orden:

**1. La paleta, como variables CSS.** Dos bloques con los mismos nombres: `:root` para el tema
claro y `[data-theme="dark"]` para el oscuro.

```css
:root {
  --ground: #eff2f8;      /* fondo de la página */
  --surface: #ffffff;     /* tarjetas */
  --surface-2: #e7ecf7;   /* fondos secundarios, hover de filas */
  --line: #ccd6e9;        /* bordes */
  --ink: #0d1526;         /* texto principal */
  --muted: #5f6d8a;       /* texto secundario */
  --brand: #8a5c0a;       /* acento: botón principal, primer clasificado */
  --win: #14684a;         /* victoria */
  --loss: #a92f36;        /* derrota */
  --series-1: #2a78d6;    /* series de las gráficas, siete tonos */
  …
}
```

**2. `@theme inline`, que las convierte en utilidades de Tailwind.** Cada `--color-x: var(--x)`
hace que existan `bg-x`, `text-x`, `border-x`. Y como apuntan a la variable y no al color,
cambian solas con el tema:

```css
@theme inline {
  --color-surface: var(--surface);
  --color-brand: var(--brand);
  --font-display: "Saira Condensed", "Arial Narrow", Impact, sans-serif;
  --spacing-nav: 4.75rem;   /* alto de la barra inferior → utilidad pb-nav */
}
```

**3. Dos utilidades propias**, declaradas con `@utility`:

- `tap` — objetivo táctil mínimo de 44 px (la recomendación de Apple y Google), en flex y
  centrado. Todos los botones y campos parten de aquí.
- `tabular` — `font-variant-numeric: tabular-nums`, para que los números se lean en columna.

Van como `@utility` y no dentro de `@layer components` por dos motivos concretos: `tabular`
necesita que una utilidad posterior pueda pisarla, cosa que dentro de `@layer base` no pasaba; y
en Tailwind v4 **`@apply` solo admite utilidades**, así que `tap` tenía que serlo para poder
usarse desde `.btn` y `.input`.

**4. `@layer components` con las clases compuestas.** Son las que se repiten por toda la
aplicación:

| Clase | Qué es | Variantes |
|---|---|---|
| `.btn` | Botón | `.btn-brand`, `.btn-ghost`, `.btn-danger`, `.btn-sm` |
| `.card` | Tarjeta con borde y sombra | `.card-head` para su cabecera |
| `.input` | Campo de formulario | Se adapta sola a `textarea` y a `select` |
| `.label` | Etiqueta pequeña en versalitas | |
| `.chip` | Pastilla | `.chip-win`, `.chip-loss`, `.chip-tie`, `.chip-brand`, `.chip-info` |
| `.seg` | Grupo de botones segmentado, lo más cómodo de pulsar en móvil | `.seg-brand`; el activo se marca con `data-on="true"` |
| `.tbl` | Tabla. Solo en pantallas anchas: en móvil se usan tarjetas | |
| `.scroll-x` | Contenedor que se desliza en horizontal sin sacar la página de sitio | |

### Cómo cambiar un color

Toca **los dos bloques de variables**, `:root` y `[data-theme="dark"]`, y ya está: cambia en toda
la web. No hace falta tocar `@theme inline` salvo que añadas un token nuevo, y en ese caso hay que
añadir su línea allí para que Tailwind genere las utilidades.

> **Nunca pongas un color literal en un componente.** Si un color solo existe en uno de los dos
> bloques, en el otro tema no se aplica y acabas con texto de un tema sobre el fondo del otro.
> El `style` en línea se reserva para valores calculados: la anchura de una barra, el color propio
> de un jugador.

### El tema y `dark:`

El tema lo decide un script síncrono en el `<head>` (`src/app/layout.tsx`) que escribe
`data-theme` en `<html>` **antes de pintar nada**: lee `localStorage`, y si no hay nada guardado
mira `prefers-color-scheme`. Va como cadena y no como componente precisamente para que se ejecute
antes del primer pintado y no haya fogonazo blanco al cargar en oscuro.

Como el tema se resuelve por variables, **casi nunca hace falta `dark:`**. La variante está
declarada de todos modos:

```css
@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));
```

Úsala solo cuando una regla tenga que cambiar de *forma* y no de color entre los dos temas.

### Tipografías

Se cargan en `src/app/layout.tsx` con un `<link>` a Google Fonts y se usan por las tres variables
de `@theme inline` — `--font-display` (titulares y marcadores), `--font-sans` (todo lo demás) y
`--font-mono` (números y listas de mazo). Para cambiarlas, actualiza el `<link>` y esas tres
líneas, y deja siempre una fuente del sistema al final de cada lista.

### Mobile-first, y de verdad

El diseño se piensa primero para el móvil, que es donde se registra una partida en mitad de un
torneo. En la práctica eso significa:

- **Las clases sin prefijo son las del móvil.** `sm:` y `md:` solo añaden lo que cambia en
  pantallas grandes; nunca al revés.
- **La navegación es distinta según el tamaño.** En móvil, una barra inferior fija con cuatro
  destinos y un botón central redondo para *Registrar partida*, más una pantalla `/mas` con el
  resto de secciones. En escritorio, la barra lateral con todo. Las dos salen de la misma lista,
  `NAV_ITEMS` en `src/lib/nav.ts`.
- **El cuerpo tiene `font-size: 16px` fijo.** Con menos, iOS hace zoom automático al enfocar un
  campo y descoloca la pantalla.
- **Contenido ancho dentro de `.scroll-x`.** Tablas, matrices y bloques de código se deslizan en
  su propio contenedor; la página nunca hace scroll horizontal.
- **La aplicación es instalable.** `public/manifest.webmanifest` la declara como PWA en
  `standalone`, y el layout raíz lo enlaza junto con los metadatos de `apple-web-app`. Se añade a
  la pantalla de inicio y arranca sin barra del navegador.

---

## Cambiar una fórmula

Todo el cálculo está en **`src/lib/stats.ts`**, en funciones puras.

**Ejemplo: añadir el enfrentamiento directo como desempate.**

En `standings()`, el orden final es:

```ts
rows.sort(
  (x, y) =>
    y.points - x.points ||
    (y.winRate ?? 0) - (x.winRate ?? 0) ||
    (y.resistance ?? 0) - (x.resistance ?? 0) ||
    y.diff - x.diff ||
    y.elo - x.elo,
);
```

Para meter el enfrentamiento directo antes de la diferencia de juegos, necesitas saber quién
ganó cuando se cruzaron. Guarda ese dato mientras recorres las partidas:

```ts
// junto a las demás acumulaciones, dentro del bucle de partidas
const h2h = new Map<string, number>();   // "pA|pB" -> +1 si ganó A
// …
if (o.winner !== "tie") {
  const winner = o.winner === "a" ? m.playerAId : m.playerBId;
  const loser  = o.winner === "a" ? m.playerBId : m.playerAId;
  h2h.set(`${winner}|${loser}`, (h2h.get(`${winner}|${loser}`) ?? 0) + 1);
}
```

Y en el `sort`:

```ts
||  ((h2h.get(`${y.playerId}|${x.playerId}`) ?? 0)
   - (h2h.get(`${x.playerId}|${y.playerId}`) ?? 0))
```

**No hay que tocar nada más.** Ni base de datos, ni componentes: la clasificación se recalcula
sola en cada carga. Compruébalo en `/ranking`.

---

## Añadir un campo a una tabla

Ejemplo real: **anotar los turnos que duró cada juego** (la columna `turns` ya existe en el
esquema, pero no tiene interfaz).

### 1. El esquema — `src/db/schema.ts`

Si la columna no existe, añádela:

```ts
export const games = pgTable("games", {
  …
  turns: integer("turns"),          // nullable: las partidas antiguas no lo tienen
});
```

> **Los campos nuevos van siempre `nullable` o con `.default()`.** Si no, `db:push` no puede
> añadir la columna a una tabla con datos.

### 2. Aplicar a la base de datos

```bash
npm run db:push
```

Este comando debe apuntar únicamente a Neon `dev` mediante `.env.local`. No automatices la
aplicación de cambios de esquema a producción.

### 3. El formulario — `src/components/MatchForm.tsx`

Añade el campo dentro de la tarjeta de cada juego, con un `name` que incluya el índice:

```tsx
<div className="mt-2 flex flex-col gap-1.5">
  <label className="label" htmlFor={`g${i}_turns`}>Turnos</label>
  <input className="input" id={`g${i}_turns`} name={`g${i}_turns`}
         type="number" min={1} inputMode="numeric" disabled={over} />
</div>
```

### 4. La acción — `src/actions/index.ts`

En `saveMatch()`, dentro del bucle que construye las filas de `games`. **Acotado**, como todo lo
que acaba en una columna `integer`:

```ts
rows.push({
  number: i + 1,
  winner,
  first: pick(fd, `g${i}_first`, ["", "a", "b"] as const, ""),
  prizesLeft: maybeInt(fd, `g${i}_prizes`, 0, 6),
  turns: maybeInt(fd, `g${i}_turns`, 1, 200),   // ← nuevo
});
```

Y añade `turns` al tipo de `rows`, unas líneas más arriba, para que TypeScript no proteste.

### 5. Enseñarlo — `src/app/(app)/partidas/[id]/page.tsx`

Una columna más en la tabla de juegos:

```tsx
<th>Turnos</th>
…
<td className="tabular">{g.turns ?? "—"}</td>
```

### 6. Comprobar

```bash
npm run dev     # registra una partida con turnos y ábrela
npm run build   # que compile
```

---

## Añadir una pantalla

Ejemplo: **una página de récords** en `/records`.

### 1. La carpeta y el fichero

```
src/app/(app)/records/page.tsx
```

Por estar dentro de `(app)`, hereda las dos navegaciones y la comprobación de sesión: el layout
del grupo lee la cookie y redirige a `/entrar` si no hay nadie. No hay que hacer nada más para
protegerla.

> Eso protege **la lectura**. Si la pantalla trae botones que escriben, la comprobación de
> permisos va dentro de cada acción, no aquí: ver
> [las dos reglas](#dos-reglas-de-seguridad-que-no-se-negocian).

### 2. El contenido

```tsx
import { loadSnapshot } from "@/lib/data";
import { isPlayed } from "@/lib/stats";
import { Empty, PageHead, PlayerTag } from "@/components/ui";

export const metadata = { title: "Récords" };

export default async function RecordsPage() {
  const snap = await loadSnapshot();
  const played = snap.matches.filter(isPlayed);

  // la serie más larga
  const longest = played
    .slice()
    .sort((a, b) => b.games.length - a.games.length)[0];

  return (
    <>
      <PageHead title="Récords" sub="Las marcas de la liga." />
      <div className="card p-4">
        {longest ? (
          <p>
            Serie más larga: {longest.games.length} juegos entre{" "}
            <PlayerTag player={snap.playersById.get(longest.playerAId)} /> y{" "}
            {longest.playerBId
              ? <PlayerTag player={snap.playersById.get(longest.playerBId)} />
              : longest.opponentName}.
          </p>
        ) : (
          <Empty title="Sin partidas todavía." />
        )}
      </div>
    </>
  );
}
```

Fíjate en el `longest.playerBId ? … : longest.opponentName`. **En cuanto una pantalla enseña
partidas, tiene que contar con que el rival puede ser de fuera** y no estar en `playersById`.
Es el descuido más fácil de cometer.

### 3. El enlace en la navegación — `src/lib/nav.ts`

Las dos navegaciones —la barra lateral de escritorio y la inferior de móvil— salen de la misma
lista, así que se añade en un solo sitio:

```ts
export const NAV_ITEMS: NavItem[] = [
  …
  { href: "/records", label: "Récords", icon: "cup" },
];
```

En móvil, la barra inferior solo enseña las rutas de `MOBILE_HREFS` (y el botón central de
registrar partida); todo lo demás aparece automáticamente en `/mas`. Si quieres que tu pantalla
esté abajo, añádela también a `MOBILE_HREFS` y quita otra: caben cuatro.

Si usas un icono que no existe, añádelo al objeto de `src/components/icons.tsx` — un `path` de
SVG en una caja de 24×24.

---

## Añadir una acción que escriba en la base

Todo lo que escribe vive en **`src/actions/index.ts`**, que empieza con `"use server"`.

**Tres reglas que no se pueden saltar:**

1. Ese fichero **solo puede exportar funciones `async`**. Nada de constantes, tipos ni clases
   exportadas: Next lo comprueba y falla el build.
2. **Lo primero de todo, los permisos.** `requireActor()` si basta con estar dentro,
   `requireManager()` si es cosa de organizadores, y `owns()` cuando se toca algo de alguien.
   Ver [las dos reglas](#dos-reglas-de-seguridad-que-no-se-negocian).
3. Toda acción termina llamando a `refresh()` (que es `revalidatePath("/", "layout")`) o a
   `redirect()`. Si no, la pantalla se queda con los datos viejos.

Plantilla:

```ts
export async function archiveCompetition(fd: FormData) {
  await requireManager();                 // 1. permisos, antes que nada
  const id = str(fd, "id");               // 2. entrada validada
  if (!id) return;
  await db.update(competitions).set({ status: "done" }).where(eq(competitions.id, id));
  refresh();                              // 3. refrescar
}
```

Y en el componente:

```tsx
<form action={archiveCompetition}>
  <input type="hidden" name="id" value={comp.id} />
  <button className="btn" type="submit">Cerrar competición</button>
</form>
```

Los ayudantes `str()`, `int()`, `maybeInt()`, `isoDate()`, `pick()` y `bool()` ya están en el
fichero para leer el `FormData` con seguridad.

**Si la acción tiene que devolverle algo al usuario** —un error de validación, un "guardado"—
usa la forma de `useActionState`: firma `(_prev: FormState, fd: FormData)` y devuelve
`{ error }` o `{ ok }`. Es lo que hacen `login`, `register`, `saveProfile` y `changePassword`,
y lo que permite pintar el mensaje sin recargar.

---

## Añadir una estadística

**Ejemplo: cuántas partidas se juegan cada día de la semana.**

### 1. La función pura — `src/lib/stats.ts`

```ts
export function activityByWeekday(matches: MatchFull[]) {
  const t = new Array(7).fill(0);
  for (const m of matches.filter(isPlayed)) {
    const d = new Date(`${m.date}T12:00:00`).getDay();  // 0 = domingo
    t[(d + 6) % 7]++;                                    // 0 = lunes
  }
  return t;
}
```

### 2. Pintarla — `src/app/(app)/estadisticas/page.tsx`

```tsx
import { activityByWeekday } from "@/lib/stats";
import { DOWS } from "@/lib/format";
// …
const weekdays = activityByWeekday(rows);

<div className="card">
  <div className="card-head"><h2>Qué días jugáis</h2></div>
  <div className="card-pad">
    <Bars rows={weekdays.map((n, i) => ({
      label: DOWS[i], value: n, right: `${n} part.`,
    }))} />
  </div>
</div>
```

`<Bars>` está en `src/components/ui.tsx` y ya se encarga de la escala y de la maquetación.

---

## Tocar el motor de Championship Points

`src/lib/cp.ts` está partido en dos mitades, y la separación es deliberada:

- **Arriba, la lógica.** Cómo se resuelven los alias, cómo se aplica el Best Finish Limit, cómo
  se decide si un tramo cobra. No cambia de una temporada a otra.
- **Abajo, los datos.** Un objeto `CpSeason` por temporada, con sus tramos de puntos y sus
  límites, y un `SEASONS` que las registra. **Es lo único que hay que tocar cuando Play! Pokémon
  publica cifras nuevas.**

Los tres conceptos que hay que tener claros antes de tocar nada:

**Alias.** Un `pokemon_cup` puntúa exactamente igual que un `league_cup`: en vez de duplicar la
tabla, se declara `aliasOf: "league_cup"` y `resolveEventDef()` la resuelve.

**Cubos de Best Finish Limit.** Del límite de seis resultados de League Cup no se libra uno
jugando Pokémon Cups: los dos tipos comparten contador. Eso es `sharesBflWith`, y `bflBucket()`
devuelve contra qué contador cuenta cada tipo. Un alias comparte cubo con su original salvo que
se diga otra cosa.

**El kicker de asistencia.** El valor en CP de un puesto es fijo; lo que depende de cuánta gente
hubo es si ese tramo reparte algo o no. Un 9.º puesto en una League Challenge vale 6 CP, pero
solo si hubo 48 personas o más. De ahí el `minPlayers` de cada tramo. Y si no se sabe la
asistencia, tampoco se da por buena: dejar el campo en blanco era la puerta de atrás para cobrar
el tramo de 48 en un torneo de seis.

### Añadir una temporada

Copia el bloque de la última, cambia los números y añade una línea a `SEASONS`:

```ts
const SEASONS: Record<number, CpSeason> = {
  2026: CP_2026,
  2027: CP_2027,
  2028: CP_2028,   // ← nuevo
};
```

Nada más. Los desplegables (`eventKinds()`), el selector de temporada de *Ajustes*
(`availableSeasons()`) y los cálculos la recogen solos.

Pon `confirmed: false` mientras las cifras sean provisionales: la interfaz lo advierte por su
cuenta en *Torneos* y en la ficha de cada jugador. **Ahora mismo la temporada 2027 está así**,
con los valores de 2026 como marcador de posición, porque Play! Pokémon anunció que cambian pero
no ha publicado las tablas en ningún sitio consultable.

Después, `npm test`.

> **Lo que este módulo no hace, a propósito: decir cuántos CP hacen falta para el Mundial.**
> Desde 2025 la invitación no va por umbral sino por **Top N del ranking de la zona**, y ese
> corte solo se conoce cuando termina la temporada. La aplicación enseña tus CP, tus huecos de
> Best Finish Limit y lo que ganarías de verdad con un resultado hipotético — pero no promete un
> número mágico que no existe. Si algún día te ves tentado de añadir una barra de progreso hacia
> "el corte", esta es la razón por la que no la hay.

---

## Cambiar el sistema de acceso

**`src/lib/auth.ts` es el único fichero que conoce la sesión y las contraseñas.** Hoy hace tres
cosas:

```ts
// contraseñas: scrypt de node:crypto, en formato "salt:hash"
hashPassword(password): Promise<string>
verifyPassword(password, stored): Promise<boolean>   // comparación en tiempo constante
passwordProblem(password): string | null             // 8+ caracteres, letra y número

// sesión: una cookie firmada con HMAC-SHA256, sin tabla de sesiones
readSession(): Promise<Session | null>               // { playerId, issuedAt }
writeSession(playerId): Promise<void>
clearSession(): Promise<void>

// invitaciones y papeles
newInviteToken(): string
inviteState(invite): InviteState                     // vale, o por qué no
canManageLeague(role) / isOwner(role)
```

Tres decisiones que conviene no deshacer sin pensarlo:

- **scrypt y no bcrypt.** scrypt viene en Node y no compila nada nativo. bcrypt da guerra en el
  despliegue precisamente por eso.
- **La caducidad se comprueba en el servidor**, en `readSession()`, y no solo con el `maxAge` de
  la cookie. El `maxAge` lo respeta el navegador; una cookie copiada valdría para siempre.
- **Al fallar el login se gasta scrypt igualmente**, contra `DUMMY_HASH`. Sin eso, un correo que
  no existe responde en microsegundos frente a los ~50 ms de una comprobación real: el mensaje
  de error es el mismo, pero el reloj delata qué correos tienen cuenta.

Para pasar a un proveedor real (Auth.js, Clerk, Google, Discord):

1. Sustituye el cuerpo de `readSession` y `writeSession` por lo que diga tu proveedor.
2. Mantén la forma `{ playerId }`: es lo que espera el resto de la aplicación.
3. Necesitarás una columna nueva en `players` para el identificador externo
   (`googleId`, `discordId`…), y resolver `playerId` a partir de ella. Recuerda decidir si es
   pública: si no lo es, va al `Omit` de `PublicPlayer`.
4. `src/app/entrar/page.tsx` con `LoginForm`, y `src/app/registro/[token]/page.tsx` con
   `RegisterForm`, se sustituyen por el botón de login del proveedor.

Nada más de la aplicación se entera del cambio.

---

## Convenciones del proyecto

**Server Components por defecto.** Un componente solo lleva `"use client"` si necesita estado o
eventos. Si dudas, no lo pongas: el error te lo dirá.

**Nada calculado se guarda.** Puntos, Elo, marcadores y porcentajes se derivan del historial en
cada carga. Si te ves añadiendo una columna `total_puntos`, párate: casi seguro que hay una
función pura mejor.

**Las fechas son cadenas `"YYYY-MM-DD"`.** Ni objetos `Date` ni timestamps. Para comparar o
ordenar, `localeCompare` sobre la cadena funciona perfectamente.

**Los identificadores los genera la aplicación** con `newId("m")`, no la base de datos.

**Los slugs de Pokémon pasan siempre por `pokeSlug()`** antes de guardarse.

**Estilos con utilidades de Tailwind y las clases compuestas de `globals.css`.** El `style` en
línea se reserva para valores calculados: la anchura de una barra, el color propio de un jugador.
Un color literal en un componente es siempre un error.

**El rival de una partida puede ser de fuera.** `playerBId` es nulable. Cualquier código que
recorra partidas tiene que decidir qué hace con eso: `isInternal()` filtra las que cuentan para
ranking y Elo, y `opponentName` / `opponentArchetypeId` son lo que hay que pintar en las demás.

**Los permisos van dentro de la acción, no en la interfaz.** Esconder un botón es una cortesía,
no una defensa.

---

## Las pruebas

```bash
npm test
```

Por debajo es `node --experimental-strip-types --test tests/*.test.ts`: Node ejecuta el
TypeScript directamente, sin compilar ni instalar ningún framework de pruebas. No hay Jest ni
Vitest, y no hacen falta.

Hoy hay **13 pruebas, todas de `src/lib/cp.ts`** (`tests/cp.test.ts`), que es donde de verdad
duele equivocarse: los CP son números que la gente compara con los oficiales, y un fallo ahí no
se ve a simple vista. Cubren la tabla por puesto, el kicker de asistencia, los tipos que no dan
CP, los alias y sus cubos compartidos, el Best Finish Limit, el valor puesto a mano, los huecos
libres de cada cubo, la simulación y el reparto de temporadas por fecha.

Varias de ellas están escritas sobre fallos reales que ya se corrigieron —el tramo que cobraba
con la asistencia en blanco, el resultado que sumaba en dos temporadas a la vez—, así que si
alguna se pone en rojo, no la ajustes para que pase: mira qué has roto.

Para añadir una prueba, un `test()` más en el mismo fichero. Para probar otro módulo, un
`tests/loquesea.test.ts` nuevo: el `*.test.ts` del comando lo recoge solo. Solo se pueden probar
así los módulos que no llevan `import "server-only"` — es decir, `stats.ts`, `cp.ts`,
`decklist.ts`, `pokemon.ts` y `format.ts`, pero no `data.ts` ni `auth.ts`.

---

## Probar sin levantar la aplicación

Node 22 ejecuta TypeScript directamente, así que las funciones puras se prueban en un segundo:

```bash
node --experimental-strip-types -e '
  import("./src/lib/decklist.ts").then(d => {
    const p = d.parseDeckList("Pokémon: 2\n2 Dragapult ex TWM 130");
    console.log("total:", p.total);
    console.log("arquetipo:", d.suggestArchetype(p));
    console.log("avisos:", d.validateDeck(p));
  })
'
```

Para algo más largo, un fichero `_prueba.ts` en la raíz (empieza por `_`, así no lo confundes con
código del proyecto) y `node --experimental-strip-types ./_prueba.ts`. Bórralo antes del commit.

Los ficheros de `src/lib/` que se pueden ejecutar así son `stats.ts`, `cp.ts`, `decklist.ts`,
`pokemon.ts` y `format.ts`. `data.ts` y `auth.ts` no: llevan `import "server-only"` y necesitan
el entorno de Next.

Si la comprobación merece quedarse, no la dejes en un fichero suelto: pásala a
`tests/` y la ejecuta `npm test` para siempre.

---

## Pedir cambios a un asistente de código

Este proyecto está pensado para que puedas pedir cambios sin escribirlos tú. Lo que mejor
funciona:

- **Di en qué fichero.** "En `src/lib/stats.ts`, añade el enfrentamiento directo como desempate
  en `standings()`" da mucho mejor resultado que "arregla los desempates".
- **Pásale el contexto.** Estos documentos, sobre todo
  [04 · Modelo de datos](04-modelo-de-datos.md) y [05 · Estadísticas](05-estadisticas.md), son
  el contexto que necesita.
- **Recuérdale las convenciones**: Server Components por defecto, nada calculado se guarda,
  fechas como cadenas, colores por token, Tailwind v4 sin `tailwind.config.js`.
- **Recuérdale las dos reglas de seguridad**: nada de datos sensibles en props que crucen al
  cliente, y permisos comprobados dentro de cada Server Action.
- **Pídele que ejecute `npm run build` y `npm test`** antes de dar el cambio por bueno.
- **Un cambio por vez.** Es más fácil revisar y más fácil deshacer.
