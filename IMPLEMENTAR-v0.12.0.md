# Cómo meter la v0.12.0 en `develop`

Va sobre la v0.11.0. **Esta sí toca la base de datos**: dos tablas nuevas. No añade
dependencias.

```bash
git checkout develop
git pull
unzip -o arena-v0.12.0-cambios.zip -d .
npm test        # 157
npm run build
```

Y antes de desplegar, el SQL. En el editor de Neon, pega entero
`drizzle/0007_v0_12_0.sql`. Es idempotente: se puede lanzar dos veces sin romper nada.
`npm run db:push` hace lo mismo leyendo el esquema de Drizzle, si lo prefieres.

---

## 1. La respuesta a la pregunta, en el código

Preguntabas si se podía raspar Limitless, RK9 o pokedata.ovh con un botón desde el
administrador, una vez al mes. La respuesta corta es que no, y conviene que quede dicha
porque explica por qué esta versión es como es.

**RK9.gg y pokemon.com** prohíben expresamente la extracción automatizada, «con o sin fines
comerciales». Lo que está prohibido ahí es el **método**, no la frecuencia: un botón que se
pulsa doce veces al año sigue siendo extracción automatizada.

**pokedata.ovh** parece la salida fácil y es la peor de las tres. No tiene condiciones de uso,
ni API documentada, ni licencia de datos, ni contacto. Su propio pie de página dice que no
está asociada a RK9 — o sea, que republica lo de RK9. Pasar por ahí no lava el origen: solo
añade un intermediario que puede caer o cambiar sin avisar y del que no tienes ninguna
garantía de exactitud.

**limitlesstcg.com** es el caso menos claro: su ToS no tiene cláusula anti-scraping explícita.
Pero tienen API oficial documentada y dicen que las claves de mayor cuota se dan «a proyectos
públicos con un caso de uso legítimo». O sea: hay un canal, y dejaron los presenciales fuera
de la API a propósito. Raspar el HTML de la parte que decidieron no servir es ir por detrás
de esa decisión, y además es frágil — un rediseño y el importador se rompe el domingo del
Regional. Si de verdad quieres el automatismo, el camino es un correo a
`contact@limitlesstcg.com` explicando qué es Arena. Si dicen que sí, el botón automático se
enchufa encima de esto sin rehacer nada: la capa de almacenamiento ya está hecha.

Y hay un problema que es independiente de los términos de las tres: **un standing de Regional
son entre ochocientas y dos mil personas con nombre y apellidos** que no se han dado de alta
en Arena. Eso no cabe en tu base de datos aunque los tres sitios te dieran permiso por
escrito.

---

## 2. Lo que sí hace la v0.12.0

Copias la clasificación que ya estás viendo, la pegas, y la app hace el resto. Copiar y pegar
son diez segundos una vez al mes; todo lo demás está automatizado.

**Ajustes → Metagame presencial.**

1. Eliges el evento en el desplegable (rellena nombre, fecha y sede de los europeos que ya
   están en el calendario) o lo escribes.
2. Dices qué estás pegando: una **clasificación** o un **desglose por mazos**.
3. Pegas.
4. **«Analizar sin guardar»** — no escribe nada. Te devuelve el recuento por mazo, cuántas
   listas de cada uno, cuántas llegaron al top 8, cuántas filas ha descartado y qué mazos no
   conocía el catálogo.
5. **«Guardar el metagame»**.

Consejo de orden: pulsa antes **«Actualizar catálogo»**, que está justo encima. El importador
casa los mazos contra él, y lo que no case se guarda por su nombre y sin sprites.

### Las dos formas de pegar

**Clasificación.** Lo que hay en la página de standings de cualquier web, con tabulaciones o
sin ellas:

```
1	Nombre Apellido	NO	Gardevoir ex	14-2-2	44
2	Otro Nombre	IT	Raging Bolt Ogerpon	13-2-3	42
```

Da puestos, así que de aquí sale la conversión a top 8 y a top 4.

**Desglose por mazos.** Cuando solo interesa el reparto del corte:

```
Gardevoir ex 6
Raging Bolt Ogerpon 5
Dragapult Dusknoir 4
```

Acepta el número delante o detrás, con guion, con `x` o sin nada. No lleva puestos, así que
suma cuota pero no conversión. Es la vía en la que no entra un nombre ni por accidente,
porque en el texto de origen no los hay.

### Top Decks → Presencial

La pantalla tiene ahora dos pestañas. **Online** es lo de siempre, de la API de Limitless.
**Presencial** es lo importado: cuota, top 8, top 4, mejor puesto de cada mazo, en cuántos
eventos aparece, y debajo la lista de eventos con su fuente enlazada.

---

## 3. Los nombres de las personas, y por qué no hace falta que te fíes de mí

Esta es la parte que de verdad importa, así que va con detalle.

**`meta_entries` no tiene columna de nombre de jugador.** No es que se deje vacía: es que no
existe. Una norma se olvida; una tabla sin columna, no. Puedes comprobarlo en Neon:

```sql
SELECT column_name FROM information_schema.columns
 WHERE table_name = 'meta_entries'
   AND column_name IN ('player', 'player_name', 'name');
-- tiene que devolver cero filas
```

El parser (`src/lib/standings.ts`) tira el nombre al leer la línea. El tipo que devuelve la
función es puesto, mazo y récord, y punto: no hay dónde meterlo aunque alguien lo intentara.

**Y cuando no se sabe si algo es un mazo o una persona, se tira.** El criterio es la
repetición: en una clasificación un nombre propio aparece **una vez** y un mazo aparece
**muchas**. Una cadena que no casa con el catálogo y sale una sola vez se descarta sin más;
para aceptarla como mazo nuevo tiene que salir en **tres puestos distintos**. Equivocarse por
descartar cuesta una fila; equivocarse por guardar cuesta el dato de alguien que no ha pedido
estar aquí.

La pantalla te dice cuántas ha descartado. Ese número es, casi punto por punto, cuánta gente
ha entrado por el textarea y no ha salido de él.

Hay un test que lo comprueba con nombres de verdad dentro del texto y luego busca cada uno en
el resultado (`tests/standings.test.ts`, «la fila que sale NO tiene dónde meter un nombre»).

---

## 4. Una advertencia sobre los números

**Lo que se importa es el metagame del corte, no el del torneo.** Si pegas el top 32 de un
Regional de 1.200 personas, la cuota que sale es la cuota de esas 32, que están elegidas por
resultados. Un mazo que juegue el 20% de la sala y no corte nunca saldrá aquí con un 3%, y no
es un fallo del cálculo.

No hay forma de corregirlo con matemáticas —no tenemos las listas que no cortaron—, así que la
pantalla lo dice arriba del todo en vez de en una nota al pie. Un número sin su contexto se
cita luego sin él.

Por eso se guarda `coverage`: hasta qué puesto llega lo pegado. Cuanto más pegues, mejor sale
la cuota. Con el top 32 ya se ve por dónde va el formato.

---

## 5. Volver a importar el mismo evento

Es lo normal: pegas el top 32 el sábado por la noche y el domingo ya está cerrado el top cut.
Vuelve a pegarlo y **se reemplaza**, no se duplica.

La identidad de un evento es **nombre + fecha + división**. La división está ahí porque el
mismo Regional tiene Masters, Seniors y Juniors, con el mismo nombre, la misma fecha y
clasificaciones distintas — sin ella, importar Seniors habría machacado Masters en silencio.

Para quitar uno hay un botón en la lista de «Eventos importados», sin pedir que escribas el
nombre: aquí no se pierde nada que no se recupere volviendo a pegar.

---

## 6. Ficheros

**Nuevos**

| Fichero | Qué es |
| --- | --- |
| `src/lib/standings.ts` | El parser. Sin imports, para que los tests lo carguen directo. Aquí vive la regla de los nombres. |
| `src/lib/metaIrl.ts` | El recuento: cuota, conversión, mejor puesto. También sin imports. |
| `src/components/MetaImport.tsx` | El formulario de Ajustes, con la previa antes de guardar. |
| `src/components/MetaIrlTable.tsx` | La tabla de la pestaña Presencial y la lista de fuentes. |
| `tests/standings.test.ts` | 23 tests. Incluye el de los nombres. |
| `tests/metaIrl.test.ts` | 12 tests. |
| `drizzle/0007_v0_12_0.sql` | Las dos tablas. **Hay que lanzarlo.** |

**Modificados**

| Fichero | Qué cambia |
| --- | --- |
| `src/db/schema.ts` | `meta_events` y `meta_entries`. |
| `src/lib/data.ts` | `loadMetaIrl()` y `loadMetaEvents()`, aparte del snapshot a propósito. |
| `src/lib/types.ts` | Tipos de la previa de importación. |
| `src/actions/index.ts` | `importMetaEvent` y `deleteMetaEvent`. |
| `src/components/icons.tsx` | Icono `trash`. |
| `src/app/(app)/ajustes/page.tsx` | La sección «Metagame presencial». |
| `src/app/(app)/topdecks/page.tsx` | Las dos pestañas. |
| `package.json` | 0.12.0. |
| `CHANGELOG.md` | La entrada. |

---

## 7. Comprobado aquí

- `npm test` → **157 de 157**.
- Comprobación de imports: 131 ficheros, ninguno roto.
- `tsc` estricto sobre los ficheros puros (`standings.ts`, `metaIrl.ts`, `cut.ts`,
  `badges.ts`, `tournamentStats.ts`, `cp.ts`): sin errores.

Lo de siempre: **`npm run build` no se puede lanzar aquí** porque el registro de npm está
bloqueado en este entorno y sin los tipos de `next`, `react` y `drizzle-orm` medio proyecto
compila como `any`. Lánzalo tú antes de subir. Si salta algo, mándamelo y lo arreglo.
