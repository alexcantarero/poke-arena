# PokeArena TCG v0.29.0 — cómo aplicarla

Va sobre la **v0.28.0**, que ya tienes aplicada.

> **Sin migración de base de datos. Sin dependencias nuevas. Sin variables de entorno nuevas.**
> Al contrario: `.env.example` deja de pedir `POKEMONTCG_API_KEY`.

**Esta versión sí tiene un paso de verificación que no me puedo saltar yo.** Está en el paso 4
y es el que de verdad valida la Fase A.

---

## Paso 1 — Descomprime

`pokearena-v0.29.0-cambios.zip` en la raíz del repo, respetando rutas. 18 ficheros.

| | Fichero |
|---|---|
| M | `package.json` (0.28.0 → 0.29.0, script `verificar:fase-a`) |
| M | `CHANGELOG.md` |
| M | `.env.example` |
| M | `docs/README.md` |
| M | `docs/13-plan-rendimiento.md` (Fase A marcada como hecha) |
| M | `src/lib/data.ts` |
| M | `src/lib/sources/tcgdex.ts` (reescrito sobre REST) |
| M | `src/app/(app)/resultados/page.tsx` (reescrito) |
| M | `src/app/(app)/ajustes/page.tsx` |
| M | `src/app/api/cards/route.ts` |
| M | `src/components/CardSearch.tsx` |
| U | `src/lib/matchQuery.ts` |
| U | `src/lib/cartas.ts` |
| U | `tests/matchQuery.test.ts` |
| U | `tests/cartas.test.ts` |
| U | `scripts/verificar-fase-a.ts` |
| U | `docs/14-datos-y-visualizacion.md` |
| U | `IMPLEMENTAR-v0.29.0.md` |

---

## Paso 2 — Borra el cliente viejo

```bash
git rm src/lib/sources/pokemontcg.ts
```

Ya no lo importa nadie. Lo sustituye `src/lib/sources/tcgdex.ts`.

---

## Paso 3 — Verifica lo de siempre

```bash
npm test          # 370 de 370
npx tsc --noEmit  # sin salida
npm run build     # esto solo lo puedes lanzar tú
```

Los dos primeros los he ejecutado aquí con tu `node_modules`.

---

## Paso 4 — La verificación que importa (lánzala contra `dev`)

```bash
npm run verificar:fase-a
```

**Qué hace y por qué existe.** La Fase A traduce a SQL un filtro que hasta ahora se aplicaba en
memoria. Ni el compilador ni los tests pueden comprobar que un `WHERE` devuelva lo mismo que un
`.filter()`: hace falta una base de datos. El script coge 17 combinaciones de filtros, pide las
partidas por los dos caminos y compara **los ids y el orden**.

Salida esperada:

```
✓ sin filtros · 143 partidas
✓ solo liga · 88 partidas
✓ presenciales · 41 partidas
...
Todo cuadra.
```

Solo lee, no escribe nada. Antes de consultar, el script exige una terminal interactiva y pide
escribir `dev`. La cadena de conexión de Neon no permite deducir de forma fiable el nombre de la
rama, así que primero comprueba en el panel de Neon que el endpoint asociado a `DATABASE_URL` es
el de `dev`. Si no se escribe exactamente `dev`, o se ejecuta sin terminal interactiva, aborta
antes de consultar. No muestra ni imprime la cadena de conexión.

**Si algo no cuadra**, el script dice qué caso y qué partidas sobran o faltan. Pégamelo tal cual
y lo arreglo: significa que una condición SQL no coincide con su equivalente en `filters.ts`,
y el caso que falla señala exactamente cuál.

El caso con más probabilidad de dar guerra es **presenciales / online**: en memoria, un torneo
sin `scope` guardado se trata como presencial, y en SQL eso se escribe
`COALESCE(tournaments.scope, 'onsite')`. Si tus torneos tienen el campo siempre relleno, los dos
caminos darán igual aunque la regla estuviera mal.

---

## Paso 5 — Pruébalo a mano

- **Resultados**: la paginación cambia de «Ver 40 más» acumulativo a Anteriores/Siguientes con
  `?pagina=2`. Comprueba que al pasar de página no se repite ni se salta ninguna partida, y
  que los filtros se mantienen al cambiar de página.
- **Resultados filtrando por arquetipo**: es el camino que no pagina en la base. Debe dar el
  mismo listado de siempre.
- **Editor de mazos → buscador de cartas**: busca «dragapult». Deben salir cartas con su set y
  su número, y la línea copiable debe seguir siendo `1 Dragapult ex TWM 130`. **La rareza ya no
  sale**, y es a propósito (ver abajo).

---

## Paso 6 — Commit y push

```bash
git add -A
git commit -m "perf: Resultados paginado en la base (Fase A) y migración a TCGdex (v0.29.0)"
git push origin development
```

---

## Qué he hecho, y las decisiones que importan

### 1. Fase A del plan de rendimiento

`/resultados` cargaba el snapshot entero para enseñar cuarenta tarjetas. Ahora la base devuelve
solo la página.

**La línea divisoria está en el arquetipo, y es deliberada.** Todo el filtro baja a SQL menos
ese, porque saber con qué se jugó una partida es resolver el mazo de cada lado y después el
arquetipo de ese mazo, pasando por el índice de mazos y por las familias (`parent_id`).
Reproducir esa cadena en SQL sería tener **dos** definiciones de «con qué se jugó», y el día que
una cambie, Resultados y Estadísticas dirían cosas distintas. Eso ya pasó una vez y es la razón
por la que existe `filters.ts`.

Así que con filtro de arquetipo se trae el conjunto ya recortado por todo lo demás y se termina
con el mismo `applyMatchFilter` de siempre. Es el caso menos frecuente y sigue siendo mucho
menos que traerlo todo. Hay un tope de 2.000 filas y, cuando se alcanza, la pantalla lo dice en
vez de mentir con un número.

Detalle que da más de lo que parece: `loadDeckArchetypeIndex()` pide **dos columnas** de `decks`
en vez de la fila completa. El índice solo mira `id` y `archetype_id`, pero la tabla lleva
además `list` y `list_json` con las 60 cartas de cada mazo.

### 2. TCGdex

La migración estaba hecha a medias en una sesión anterior y con restos de un reemplazo
automático de texto. Lo que he encontrado y arreglado:

- **El cliente montaba la consulta GraphQL concatenando lo que tecleabas** dentro del documento
  de la consulta, con un filtro de comillas por delante. Es construir código con datos del
  usuario. Lo he reescrito sobre la **API REST documentada**: los parámetros van en el
  querystring y `URLSearchParams` los escapa solo.
- `src/lib/sources/pokemontcg.ts` seguía ahí sin que lo usara nadie.
- `hasPokemonTcgKey()` se calculaba en Ajustes y **no se usaba en ninguna parte del JSX**.
- Los comentarios de `api/cards` decían que «tcgdex.io está deprecada y sus claves mueren el 1
  de marzo de 2027». Eso era cierto de pokemontcg.io; un reemplazo ciego lo dejó diciendo algo
  falso sobre la fuente nueva. Lo mismo en el texto que ve el usuario en el buscador.
- `available` en `/api/cards` había dejado de distinguir «no existe esa carta» de «la fuente no
  contesta», porque el stub de la clave devolvía siempre `false`.

**Lo que se pierde:** la lista de resultados REST de TCGdex no trae la rareza. Sale `null` y la
pantalla no la enseña. La línea de decklist no la necesita. Si la quieres de vuelta, se puede
hacer con GraphQL **usando variables**, nunca concatenando; lo dejé fuera porque no puedo
probar el esquema desde aquí y un fallo ahí deja el buscador vacío en silencio.

Nota de contexto: TCGdex no pide clave y no publica un límite duro de peticiones, pide
moderación. Por eso siguen el antirrebote de 400 ms y las tres letras mínimas.

### 3. Datos y visualización — está en `docs/14-datos-y-visualizacion.md`

El resumen de lo que encontré mirando el esquema y los formularios:

**Tienes dos columnas de alto valor que nadie rellena.** `games.prizes_left` la **acepta la
Server Action** (lee `g{i}_prizes`, valida 0–6) pero **ningún formulario la envía**, así que
siempre llega nula. `games.turns` no la escribe nadie en ninguna parte. Son los premios
restantes (el margen de victoria: «gané 6-1» no es «gané 6-5») y los turnos (la duración, de
donde sale el riesgo de empate por tiempo). Dos números por juego, en la pantalla donde ya
estás apuntando el resultado.

Y `mulligansA`/`mulligansB` **ya se guardan** y no se usan en ninguna estadística.

**Sobre la librería: mi recomendación es quedarte con Recharts y no añadir una segunda.**
Recharts 3.10 hace todo lo que está en el plan menos matrices y diagramas de flujo, y esos ya
los resuelves con SVG propio, como `H2HHeatmap`. Meter nivo, ECharts o Chart.js al lado traería
dos estéticas, dos APIs y el doble de JavaScript al móvil, sin resolver nada que no esté
resuelto.

**Lo que de verdad cambiaría la sensación de la app no es una librería: es que pinchar una
barra navegue.** Pinchar Dragapult en «Rendimiento» debería llevar a
`/resultados?arquetipo=a-dragapult`. El filtro ya existe, la URL ya existe; falta cablear el
`onClick` a un `Link`. Es barato y es el punto 2 del orden propuesto en el documento.

---

## Cómo deshacerlo

**Todo:** `git revert HEAD`.

**Solo la Fase A**, si el script de paridad saca algo raro y quieres desplegar lo demás:
recupera la versión anterior de `src/app/(app)/resultados/page.tsx` con
`git checkout HEAD~1 -- "src/app/(app)/resultados/page.tsx"`. Las funciones nuevas de `data.ts`
pueden quedarse: nadie más las llama.

**Solo TCGdex:** no tiene vuelta atrás útil. La fuente anterior está deprecada y muere en
marzo; volver a ella sería volver a un callejón sin salida.

---

## Lo siguiente

1. **Lanza `npm run verificar:fase-a`** y dime qué sale. Hasta entonces, la Fase A está escrita
   pero no verificada.
2. **Campos de premios restantes y turnos** en el formulario de juego. Es el punto 1 del
   documento 14 y lo que desbloquea todo lo demás de visualización.
3. **Fase B del rendimiento** (`docs/13-plan-rendimiento.md`): consultas propias para
   `/calendario`, `/mazos` y `/torneos`. Las tareas están redactadas para pegárselas a un
   agente.
