# El nuevo inicio, y una corrección que te debo

## 1. Lo primero: me equivoqué hace cinco días

Cuando preguntaste por recoger los Regionales automáticamente te dije que no había forma
legítima. **La hay, y es justo la web que me acabas de pasar.**

Ciphermaniac lo pone en su página «About»:

> «Ciphermaniac is completely open source. Check out or contribute to the codebase on GitHub,
> and read our API documentation to **use our data however you like**.»

Es un proyecto de un solo desarrollador —Reese, profesor, sin publicidad y pagándolo de su
sueldo—, **con licencia MIT**, y con documentación de API de verdad. Lo que yo te dije sobre
RK9 sigue siendo cierto: no se raspa. Lo que no encontré es que alguien ya había hecho ese
trabajo con permiso y lo publica para que otros lo usen. Eso es un fallo de investigación mío,
no un cambio de las reglas.

### Qué hay exactamente

La base es `https://r2.ciphermaniac.com` y sirve ficheros JSON ya digeridos:

| Ruta | Qué trae |
| --- | --- |
| `reports/tournaments.json` | El catálogo de eventos presenciales, del más reciente primero. **Es el punto de entrada obligatorio**: sus normas dicen que no se adivinen URLs. |
| `reports/{fecha}, {evento}/meta.json` | Identidad del evento, fechas, tamaño del campo. |
| `reports/{fecha}, {evento}/archetypes/index.json` | Los arquetipos con slug estable, nombre, número de mazos, cuota, miniaturas y cartas insignia. |
| `reports/{fecha}, {evento}/conversion.json` | Conteos de Día 1 y Día 2. **Es el fichero que da la conversión**, y es opcional: no todos los eventos lo tienen. |
| `reports/{fecha}, {evento}/slices/topcut/` | La misma familia de informes, pero solo del corte. |
| `reports/Online - Last 14 Days/` | El meta online rodante. Es **contra esto** con lo que se compara el «sobrejugado». |
| `pokemon-sprites/gen9/{slug}.png` | Los sprites, los mismos que ya usa Arena. |

### Las condiciones, que son razonables y hay que cumplirlas

- **CORS restrictivo.** Desde el navegador no se puede leer sin pedir que metan tu dominio en
  la lista, a través de su formulario de feedback. **Pero las lecturas de servidor a servidor
  no pasan por CORS**, y Arena ya lee Limitless desde el servidor: el mismo patrón vale, sin
  pedir permiso a nadie.
- Aun así piden tres cosas a quien lee desde servidor: **identificarse** (una cabecera
  `User-Agent` con el nombre del proyecto), **limitar el ritmo** y **cachear**. Con un
  `revalidate` de seis horas, como el cliente de Limitless, Arena haría un puñado de peticiones
  al día.
- **Atribución.** «Tournament data is sourced from LimitlessTCG and Play! Limitless; use it
  responsibly and retain appropriate attribution.» En el pie del panel, con enlace.
- Y una cosa que no es obligatoria pero que yo haría: el tío lo paga de su bolsillo y tiene un
  Ko-Fi. Si esto acaba siendo la fuente del inicio de Arena, invítale a un café.

### Lo que no he podido comprobar

**Ahora mismo los ficheros de datos devuelven 404.** Probé `reports/tournaments.json` y
`build/v1/channels/production.json` y los dos fallan; su propia página de documentación dice
«Latest release unavailable». La documentación se lee bien, el origen de datos no responde. Así
que **el cliente hay que probarlo en vivo antes de fiarse de él**, y por eso no te lo mando
escrito a ciegas: escribir trescientas líneas contra un contrato que no puedo ejecutar es
exactamente cómo se rompió la v0.9.0.

---

## 2. Un aviso sobre las capturas que me pasaste

Las dos pantallas usan **denominadores distintos** y es facilísimo mezclarlos.

En la ficha de Baltimore, la insignia de Dragapult dice «18% del campo · 10% online». Pero en
el panel «Top archetypes» de su portada, Dragapult sale al **10,1% con 768 mazos**. Si divides,
768 entre 0,101 son unos 7.600 mazos: eso **no es Baltimore** (3.118 listas), es una ventana de
varios eventos.

O sea: el panel de arriba es de un evento y el de abajo es del meta agregado. Si los pones
juntos en el inicio sin decirlo, vas a estar comparando dos cosas distintas y los números no
van a cuadrar nunca. En la especificación de abajo van separados y etiquetados.

---

## 3. El inicio, bloque a bloque

### Bloque 1 · Tu resumen (arriba, compacto, siempre visible)

Cuatro cifras en una fila —dos por dos en el móvil—, sin gráficos:

| | |
| --- | --- |
| **Partidas de la liga** | el total, y debajo «N este mes» |
| **Tuyas** | las tuyas del mes, y debajo tu total |
| **Tu Elo** | el número, y debajo la variación desde la última jornada |
| **Líder** | quién va primero y a cuántos puntos estás |

La gracia de las dos últimas juntas es que responden «¿cómo voy?» y «¿cuánto me falta?» de un
vistazo, que es a lo que se entra al inicio.

### Bloque 2 · El último Regional (el grueso)

Es la parte que se parece a ciphermaniac. Cuatro piezas, en este orden:

**Cabecera.** Nombre, fecha, sede, y la fila de cifras: jugadores · listas · a Día 2 · top cut ·
**«5 de 8 arquetipos en el corte»**. Esa última es la que mejor resume un formato en cuatro
palabras: si el corte fue variado o un monocultivo.

**Las cuatro insignias.** Es lo que se recuerda de un Regional:

- ⭐ **Rindió** — el mazo que convirtió muy por encima de la media.
- ▼ **Decepcionó** — el que llevaba mucha gente y no pasó casi nadie.
- ▲ **Sobrejugado** — el que se llevó bastante más de lo que se juega online.
- ▲ **Espejo del corte** — el que copó las plazas.

**Un detalle que cambia si esto miente o no:** la conversión se mide **contra la media del
campo**, no contra cero. En Baltimore pasaron 559 de 3.118, o sea el 17,9%. Un mazo al 25% es
bueno porque el campo estaba al 18, no porque uno de cada cuatro pase. Sin esa referencia, en
un torneo con corte generoso todos los mazos parecen buenísimos.

**El selector que pediste.** Dos pestañas sobre el mismo panel:

- **Global** — el Regional entero, desde ciphermaniac.
- **Vuestro grupo** — solo lo que habéis metido vosotros en Arena.

Y aquí está lo bonito de cómo sale barato: **es el mismo componente con los mismos datos de
entrada**. Tanto lo de ciphermaniac como los resultados de la app se convierten a la misma
forma —nombre, mazos en el campo, cuántos pasaron, plazas del corte, cuota online— y el panel
no se entera de dónde vienen. Cambiar de pestaña es cambiar el array, no reescribir la
pantalla.

Con el grupo los números serán pequeños, y eso está bien siempre que la pantalla lo diga: «6
resultados vuestros» al lado del título evita que alguien lea un 50% de conversión sobre dos
torneos como si fuera un dato.

**La tabla.** Los arquetipos ordenados por cuota, con conversión al lado, y el top cut listado
como en su web —puesto, jugador y mazo—. Con un matiz nuestro: en la vista «Global» los nombres
de los jugadores del top cut **no se guardan** (esa es la regla que pusimos en la v0.12.0), así
que o se pintan sin guardar nada, leyéndolos de la API en cada carga, o se enseña solo el mazo.
Yo enseñaría solo el mazo y el puesto: es lo que aporta.

### Bloque 3 · Conversión de torneos, plegada

Un `<details>` cerrado por defecto. El `<summary>` sigue diciendo lo único urgente —«Conversión
de torneos · 34% al corte en 12 torneos»— y quien quiera la tabla la abre. Igual que el panel
del camino al corte de la otra entrega: la memoria del abierto/cerrado en `localStorage` con
`try/catch`.

### Bloque 4 · Las estadísticas de jugadores se mudan

Se van fuera del inicio, a la pantalla de Estadísticas, como una pestaña más junto a las que ya
tiene. El inicio se queda con «cómo voy yo» y «qué está pasando en el mundo», que son dos
preguntas, no diez.

---

## 4. Lo que va en el zip

`src/lib/metaBadges.ts` — la lógica de las cuatro insignias, pura y sin imports, como `cut.ts`
y `estructura.ts`. Funciona igual con los datos de ciphermaniac y con los vuestros, que es lo
que hace que el selector sea gratis.

`tests/metaBadges.test.ts` — 19 tests, con el Regional de Baltimore de fixture. Si el módulo
saca las mismas cuatro frases que su web con los mismos datos, es que la lógica coincide: sale
Clefairy Ogerpon al 67%, Beedrill al 0% de 20 pilotos, Dragapult a +7,8 pp y Basic Box con 3 de
8. Y los tests que evitan contar cuentos: un mazo con tres pilotos al 100% no se corona, un 0%
con cuatro pilotos no es una decepción, y para ser «top» hay que batir a la media del campo, no
bastar con convertir.

Suite completa: **195 de 195**. `tsc` estricto sobre los ficheros puros, sin errores.

---

## 5. Lo que necesito de ti

**El código.** Dijiste de conectar `D:\Projects\poke-arena` y todavía no aparece; desde aquí no
puedo concederla yo, la tienes que añadir con «Add folder» en la app de escritorio. El servidor
Filesystem que tienes instalado tampoco me sirve: sus herramientas fallan en esta sesión por un
problema de esquema.

Si te resulta más cómodo, mándame un zip con `src/`, `drizzle/` y `package.json` y me vale
igual. Sin una de las dos cosas no puedo tocar el inicio: tu repo va por delante del mío y te
pisaría trabajo.

**Un minuto de navegador.** Abre `https://r2.ciphermaniac.com/reports/tournaments.json` y dime
si te carga. Si a ti te va y a mí no, es cosa de mi salida a internet y escribo el cliente ya.
Si a ti tampoco, es que su origen está caído y toca esperar.
