# 07 · Guía de desarrollo

Recetas concretas para modificar Arena. Cada una dice qué ficheros tocar, en qué orden, y cómo
comprobar que ha salido bien.

**Índice**

- [Antes de tocar nada](#antes-de-tocar-nada)
- [Cambiar los colores o la tipografía](#cambiar-los-colores-o-la-tipografía)
- [Cambiar una fórmula](#cambiar-una-fórmula)
- [Añadir un campo a una tabla](#añadir-un-campo-a-una-tabla)
- [Añadir una pantalla](#añadir-una-pantalla)
- [Añadir una acción que escriba en la base](#añadir-una-acción-que-escriba-en-la-base)
- [Añadir una estadística](#añadir-una-estadística)
- [Cambiar el sistema de acceso](#cambiar-el-sistema-de-acceso)
- [Convenciones del proyecto](#convenciones-del-proyecto)
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
```

Es exactamente lo que ejecuta Vercel. Si pasa aquí, el despliegue va a funcionar.

---

## Cambiar los colores o la tipografía

Todo el diseño está en **`src/app/globals.css`**, y los primeros 50 renglones son los tokens.

```css
:root{
  --ground:#f1f4fa;      /* fondo de la página */
  --surface:#ffffff;     /* tarjetas */
  --surface-2:#e8eef8;   /* fondos secundarios, hover de filas */
  --line:#cfd9ec;        /* bordes */
  --text:#101a2d;        /* texto principal */
  --muted:#64718c;       /* texto secundario */
  --gold:#9a6a10;        /* acento: botón principal, primer clasificado */
  --blue:#2b56d8;        /* enlaces, barras neutras */
  --win:#177a52;         /* victoria */
  --loss:#b8353a;        /* derrota */
  ...
}
```

**Hay tres bloques con los mismos tokens** y hay que tocar los tres:

1. `:root { … }` — tema claro.
2. `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { … } }` — tema oscuro
   automático.
3. `:root[data-theme="dark"] { … }` — tema oscuro forzado.

> **Nunca pongas un color literal dentro de un componente.** Si un color solo existe en el bloque
> oscuro, en tema claro no se aplica y sale texto de un tema sobre el fondo del otro. Todo color
> sale de un token.

**Tipografías:** se cargan en `src/app/layout.tsx` con un `<link>` a Google Fonts, y se usan a
través de tres variables:

```css
--f-display: "Saira Condensed", …   /* titulares, marcadores, posiciones */
--f-body:    "IBM Plex Sans", …     /* todo lo demás */
--f-mono:    "IBM Plex Mono", …     /* números en columnas */
```

Para cambiarlas: actualiza el `<link>` del layout y las tres variables. Deja siempre una fuente
del sistema al final de cada lista.

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

### 3. El formulario — `src/components/MatchForm.tsx`

Añade el campo dentro de la fila de cada juego, con un `name` que incluya el índice:

```tsx
<div className="field">
  <label htmlFor={`g${i}_turns`}>Turnos</label>
  <input className="inp" id={`g${i}_turns`} name={`g${i}_turns`}
         type="number" min={1} disabled={over} />
</div>
```

### 4. La acción — `src/actions/index.ts`

En `saveMatch()`, dentro del bucle que construye las filas de `games`:

```ts
const turns = str(fd, `g${i}_turns`);
rows.push({
  number: i + 1,
  winner,
  first: str(fd, `g${i}_first`),
  prizesLeft: prizes === "" ? null : Number(prizes),
  turns: turns === "" ? null : Number(turns),   // ← nuevo
});
```

### 5. Enseñarlo — `src/app/(app)/partidas/[id]/page.tsx`

Una columna más en la tabla de juegos:

```tsx
<th>Turnos</th>
…
<td className="num">{g.turns ?? "—"}</td>
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

Por estar dentro de `(app)`, hereda la barra lateral y la comprobación de sesión: no hay que
hacer nada más para protegerla.

### 2. El contenido

```tsx
import { loadSnapshot } from "@/lib/data";
import { isPlayed, outcome } from "@/lib/stats";
import { PageHead, PlayerTag } from "@/components/ui";

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
      <div className="card card-pad">
        {longest ? (
          <p>
            Serie más larga: {longest.games.length} juegos entre{" "}
            <PlayerTag player={snap.playersById.get(longest.playerAId)} /> y{" "}
            <PlayerTag player={snap.playersById.get(longest.playerBId)} />.
          </p>
        ) : (
          <p className="hint">Sin partidas todavía.</p>
        )}
      </div>
    </>
  );
}
```

### 3. El enlace en la barra lateral — `src/components/Nav.tsx`

Añade una entrada al array `items` y un icono al objeto `ICONS` (un `path` de SVG en una caja de
24×24).

```ts
{ href: "/records", label: "Récords", icon: "cup" },
```

---

## Añadir una acción que escriba en la base

Todo lo que escribe vive en **`src/actions/index.ts`**, que empieza con `"use server"`.

**Dos reglas que no se pueden saltar:**

1. Ese fichero **solo puede exportar funciones `async`**. Nada de constantes, tipos ni clases
   exportadas: Next lo comprueba y falla el build.
2. Toda acción termina llamando a `refresh()` (que es `revalidatePath("/", "layout")`) o a
   `redirect()`. Si no, la pantalla se queda con los datos viejos.

Plantilla:

```ts
export async function archiveCompetition(fd: FormData) {
  const id = str(fd, "id");
  if (!id) return;
  await db.update(competitions).set({ status: "done" }).where(eq(competitions.id, id));
  refresh();
}
```

Y en el componente:

```tsx
<form action={archiveCompetition}>
  <input type="hidden" name="id" value={comp.id} />
  <button className="btn" type="submit">Cerrar competición</button>
</form>
```

Los helpers `str()`, `num()` y `bool()` ya están en el fichero para leer el `FormData` con
seguridad.

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

## Cambiar el sistema de acceso

**`src/lib/auth.ts` es el único fichero que conoce la sesión.** Expone cinco cosas:

```ts
readSession(): Promise<Session | null>
writeSession(playerId: string): Promise<void>
clearSession(): Promise<void>
codeMatches(input, expected): boolean
effectiveInviteCode(dbCode: string): string   // el código de Ajustes, o el de .env si está vacío
```

Para pasar a un proveedor real (Auth.js, Clerk, Google, Discord):

1. Sustituye el cuerpo de `readSession` y `writeSession` por lo que diga tu proveedor.
2. Mantén la forma `{ playerId }`: es lo que espera el resto de la aplicación.
3. Necesitarás una columna nueva en `players` para el identificador externo
   (`googleId`, `discordId`…), y resolver `playerId` a partir de ella.
4. `src/app/entrar/page.tsx` y `src/components/EnterForm.tsx` se sustituyen por el botón de
   login del proveedor.

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

**Estilos por clase, no por `style`.** Las clases están en `globals.css`. El `style` en línea se
reserva para valores calculados: la anchura de una barra, un color que depende de un porcentaje.

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

Los ficheros de `src/lib/` que se pueden ejecutar así son `stats.ts`, `decklist.ts`,
`pokemon.ts` y `format.ts`. `data.ts` y `auth.ts` no: llevan `import "server-only"` y necesitan
el entorno de Next.

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
  fechas como cadenas, colores por token.
- **Pídele que ejecute `npm run build`** antes de dar el cambio por bueno.
- **Un cambio por vez.** Es más fácil revisar y más fácil deshacer.
