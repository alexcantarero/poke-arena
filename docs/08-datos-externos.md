# 08 · Datos externos y APIs

Qué datos de fuera usa Arena, de dónde salen, y qué opciones hay si algún día queréis más.

---

## Resumen

| Para qué | Fuente | ¿Clave? | ¿Obligatorio? |
|---|---|---|---|
| Sprites de los Pokémon del arquetipo | `r2.limitlesstcg.net` | No | No — si falla, se ve un disco de color |
| Catálogo de arquetipos del metagame | API de Limitless (`play.limitlesstcg.com/api`) | **No** | No — hay 20 de serie y podéis crear los vuestros |
| Color (tipo de energía) de cada arquetipo | PokéAPI | No | No — sin él entran como incoloros |
| Imágenes de cartas de una lista | CDN de Limitless (`tpci`) | No | No — cada carta que no cargue se ve como texto |
| Listas de mazo | Las pegáis vosotros | — | No |

**Arena funciona entera sin conexión a ninguna de estas fuentes.** Todo lo externo es
enriquecimiento visual u opcional.

### Qué NO se usa, y por qué

- **RK9.gg** — no tiene API pública, y sus condiciones prohíben expresamente la extracción
  automatizada de datos «con o sin fines comerciales». El inciso es deliberado y elimina la
  excusa de «es un proyecto personal». No está ni como respaldo.
- **pokemontcg.io** — funciona hoy, pero está **deprecada**: no admite registros nuevos y las
  claves existentes dejan de valer el 1 de marzo de 2027. Sirve para un volcado puntual, no como
  dependencia. Su sucesora, Scrydex, es de pago por créditos.
- **TCGdex** — alternativa viva, gratis, sin clave y con español, para imágenes de carta. Es el
  reemplazo natural el día que el CDN de Limitless cambie de sitio. Requiere mapear el código de
  set (TWM, MEG…) al identificador de TCGdex, que es el único trabajo pendiente.
- **JustInBasil** — buen recurso para leer, pero sin API y con la página del metagame sin
  actualizar desde julio de 2025.

---

## Catálogo de arquetipos: cómo llega Grimmsnarl

El endpoint que uno esperaría —`/api/games/PTCG/decks`, el catálogo maestro con las reglas de
clasificación— **pide clave**, y Limitless solo las concede a proyectos de cara al público. Una
liga privada no lo es. Dar por hecho que algún día llegará es tener el catálogo roto para
siempre, y eso es exactamente lo que pasaba: por eso faltaban mazos.

La vuelta está en `src/lib/sources/limitless.ts`. Estos dos responden **sin clave**:

```
GET /api/tournaments?game=PTCG&format=STANDARD&limit=20
GET /api/tournaments/<id>/standings
```

Y cada fila de una clasificación trae el arquetipo **ya identificado por ellos**:

```json
{
  "placing": 2,
  "record": { "wins": 8, "losses": 2, "ties": 1 },
  "deck": { "id": "dragapult-blaziken", "name": "Dragapult Blaziken",
            "icons": ["dragapult", "blaziken"] }
}
```

Recorriendo los torneos recientes y agrupando por `deck.id` sale el catálogo entero, y además
con el número de apariciones, que es el share real del metagame. Se mantiene solo y no depende
de que nadie os conceda nada.

Se lanza de dos maneras:

- **Desde Ajustes**, con el botón «Actualizar catálogo». Es la que se va a usar.
- **Desde la terminal**, con `npm run archetypes:sync` (acepta `--tournaments 40`,
  `--min-players 32` y `--dry` para ver qué haría sin escribir nada).

Las dos hacen lo mismo: **solo añaden**. Nunca renombran un arquetipo que ya exista, porque
puede que le hayáis puesto vuestro propio nombre —«Festival Lead» en vez de «Dipplin Thwackey»—.

Si algún día conseguís clave, se pone en `LIMITLESS_API_KEY` y el código usa el endpoint oficial
sin que haya que tocar nada: se intenta primero y se cae al metagame si falla.

### El color de cada arquetipo

Limitless da el nombre y el sprite, pero no el tipo de energía, así que todo entraba como
«incoloro» y había que repasarlo a mano. `src/lib/sources/pokeapi.ts` le pregunta el tipo del
Pokémon principal a **PokéAPI** y lo traduce al del TCG. La traducción no es uno a uno porque el
juego de cartas agrupa: Bicho va con Planta, Fantasma con Psíquico, Veneno con Oscuro, y Tierra
y Roca con Lucha. Esa tabla es lo único de ese fichero que es una decisión y no un dato.

---

## Sprites de arquetipo

```
https://r2.limitlesstcg.net/pokemon/gen9/<slug>.png
```

Es la ruta que usa el propio Limitless en su página de metagame. No necesita clave ni registro.
Ejemplos:

```
https://r2.limitlesstcg.net/pokemon/gen9/dragapult.png
https://r2.limitlesstcg.net/pokemon/gen9/excadrill-mega.png
https://r2.limitlesstcg.net/pokemon/gen9/ogerpon-wellspring.png
```

### El slug

Limitless nombra al **Pokémon base**, con la forma como sufijo y sin sufijos de rareza. La
función `pokeSlug()` de `src/lib/pokemon.ts` traduce lo que escribe la gente:

| Escribes | Slug | Por qué |
|---|---|---|
| `Mega Excadrill ex` | `excadrill-mega` | "Mega" pasa a sufijo, se quita el "ex" |
| `N's Zoroark ex` | `zoroark` | Se quita el prefijo de personaje |
| `Lillie's Clefairy ex` | `clefairy` | Ídem |
| `Rocket's Mewtwo ex` | `mewtwo` | Ídem |
| `Ogerpon Wellspring ex` | `ogerpon-wellspring` | La forma sí forma parte del nombre |
| `Raging Bolt ex` | `raging-bolt` | Espacio → guion |
| `Charizard V` | `charizard` | Se quitan V / VMAX / VSTAR / GX |
| `excadrill-mega` | `excadrill-mega` | Si ya es un slug, se deja |

> Si un sprite sale roto, el slug no coincide con el de Limitless. Búscalo en
> <https://limitlesstcg.com/decks>, mira la URL de la imagen y corrígelo en el mazo.
> **No afecta a ninguna estadística**: el arquetipo se identifica por su registro en la base de
> datos, no por si la imagen carga.

### Por qué `<img>` y no `next/image`

`src/components/ui.tsx` usa una etiqueta `<img>` normal. `next/image` optimizaría las imágenes
en el servidor, pero son sprites de 60×60 píxeles que ya vienen optimizados desde un CDN: la
optimización costaría más de lo que ahorra, y consumiría cuota de transformaciones de Vercel.
`next.config.ts` deja configurado `remotePatterns` por si algún día queréis cambiar.

---

## Catálogo de arquetipos — API de Limitless

```
GET https://play.limitlesstcg.com/api/games/PTCG/decks
```

Documentación: <https://docs.limitlesstcg.com/developer/games>

Devuelve cada arquetipo con esta forma:

```json
{
  "identifier": "dragapult-ex",
  "name": "Dragapult ex",
  "icons": ["dragapult"],
  "priority": 10,
  "generation": 9,
  "cards": [{ "name": "Dragapult ex", "count": "2" }],
  "variants": [ … ]
}
```

**`icons` encaja exactamente con el modelo de Arena**: el primero es el Pokémon principal y el
segundo, si existe, el secundario.

### Sincronizar

```bash
npm run archetypes:sync
```

El script `scripts/sync-archetypes.ts`:

- Se queda solo con los de generación 9 en adelante (el Standard actual).
- **Solo añade los que faltan.** Nunca sobreescribe uno que ya tengáis, porque puede que le
  hayáis puesto vuestro propio nombre.
- Descarta los que coincidan en principal + secundario con alguno existente, para no duplicar.
- Deja el tipo en `colorless`: repásalo desde *Mazos* si os importa el color.

### Clave de API

La mayoría de endpoints de Limitless son públicos y **no piden clave**. El de `/decks` puede
pedirla. Si el script responde con un error de autorización:

1. Pide una clave en <https://play.limitlesstcg.com/account/settings/api>.
2. Añádela a `.env.local`:
   ```bash
   LIMITLESS_API_KEY="tu-clave"
   ```

El script la manda tanto por query string (`?key=`) como por cabecera (`X-Access-Key`).

> Las claves se conceden a proyectos con un caso de uso legítimo. Un tracker privado de liga lo
> es, pero no es imprescindible: los 20 arquetipos que trae `npm run db:seed` cubren el metagame
> actual y podéis crear los que falten a mano en dos clics.

---

## Importador de listas de mazo

`src/lib/decklist.ts`. Entiende tres formatos.

### Pokémon TCG Live / Limitless (el habitual)

Abre el mazo en PTCG Live → **Exportar**. O en Limitless → **Compartir → Copiar como texto**.

```
Pokémon: 14
3 Dragapult ex TWM 130
3 Drakloak TWM 129
4 Dreepy TWM 128

Trainer: 31
4 Arven OBF 186
3 Iono PAL 185

Energy: 15
9 Basic {P} Energy SVE 13

Total Cards: 60
```

### PTCGO (el antiguo)

```
****** Pokémon Trading Card Game Deck List ******

##Pokémon - 13

* 1 Oranguru SUM 113
* 3 Darkrai-EX BKP 74
```

### Suelto

Sin cabeceras de sección, una carta por línea: `3 Dragapult ex TWM 130`, o incluso
`3 Dragapult ex`. Todo lo que no lleve sección se mete en Pokémon.

### Qué hace con ella

- La separa en Pokémon / Entrenador / Energía y cuenta cada una.
- Las líneas que no entiende van a `errors` y se muestran en rojo, sin bloquear el guardado.
- `validateDeck()` avisa si no suma 60 cartas o si hay más de 4 copias de algo que no sea energía.
- `suggestArchetype()` propone el Pokémon principal y el secundario.

### Cómo propone el arquetipo

Puntúa cada Pokémon: la cantidad de copias, +6 si es *ex*, +5 si es *V/VMAX/VSTAR*, +6 si es
*Mega*. El de mayor puntuación es el principal.

Para el **secundario** solo mira cartas *protagonistas* (ex, V, VMAX, VSTAR, Mega) y descarta
las que compartan nombre con el principal. Es lo que evita que una línea evolutiva completa
—Dreepy, Drakloak, Dragapult ex— acabe proponiendo "Dreepy" como segundo Pokémon del arquetipo.
Si no hay una segunda carta protagonista, deja el secundario vacío.

```
Dragapult ex + Drakloak + Dreepy + Dusknoir  →  { main: "Dragapult", secondary: "" }
Ogerpon ex + Ogerpon Wellspring ex + Raging Bolt ex
                                     →  { main: "Raging Bolt", secondary: "Ogerpon" }
```

Es una sugerencia: siempre puedes escribir los dos a mano.

---

## Si algún día queréis imágenes de cartas

Las listas ya se guardan interpretadas en `decks.list_json`, con nombre, código de set y número
de cada carta. Con eso se puede pedir la imagen a una API de cartas.

### TCGdex — la opción recomendada

<https://tcgdex.dev>

- Gratuita, de código abierto, **sin clave**.
- **En español**, entre otros 13 idiomas.
- REST y GraphQL, con SDK de TypeScript.
- Trae imágenes de todas las cartas.

```
GET https://api.tcgdex.net/v2/es/cards?name=Dragapult
GET https://api.tcgdex.net/v2/es/sets/swsh3/136
```

Las imágenes se piden con calidad y extensión al final: `<image>/high.png`.

### Pokémon TCG API (pokemontcg.io)

<https://pokemontcg.io> — la histórica y más completa en metadatos de precios y legalidad. Ahora
forma parte de Scrydex y **pide clave**. Los datos en crudo siguen en
<https://github.com/PokemonTCG/pokemon-tcg-data>, que se puede descargar entero.

### Cómo lo montaría

1. Un script que recorra `decks.list_json`, resuelva cada carta contra TCGdex y guarde la URL de
   la imagen en un campo nuevo del JSON. Así no se llama a la API en cada visita.
2. En el detalle de partida, pintar la lista como una rejilla de imágenes en vez de texto.

No hace falta tocar el esquema: `list_json` es `jsonb` y admite campos nuevos.

---

## Nota legal

Arena **no redistribuye** datos ni imágenes de cartas: referencia sprites públicos de Limitless
y guarda únicamente las listas que vosotros peguéis. Pokémon y Pokémon TCG son marcas de The
Pokémon Company, Nintendo, Game Freak y Creatures Inc.; este proyecto no está afiliado a ninguna
de ellas. Si algún día lo abrís al público, revisad las condiciones de uso de la fuente de
imágenes que estéis usando.
