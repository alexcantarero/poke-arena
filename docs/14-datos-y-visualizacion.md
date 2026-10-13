# 14 · Datos y visualización

Escrito el 13/10/2026, sobre la v0.29.0.

## La tesis

La app no tiene un problema de gráficas. Tiene un problema de **qué hay dentro** de las
gráficas. Recharts ya pinta casi todo lo que hace falta; lo que falta es que la partida que
apuntas deje más rastro, y que al tocar un dato se pueda tirar del hilo.

Por eso este plan va en ese orden: primero lo que se captura, después cómo se recorre, y solo
al final la librería. Cambiar de librería antes de arreglar lo primero sería pintar más bonito
lo mismo de siempre.

---

## Parte 1 · Lo que se está dejando sin apuntar

Medido sobre el esquema y los formularios de la v0.29.0.

### Dos columnas existen y nadie las rellena

| Columna | Estado real |
| --- | --- |
| `games.prizes_left` | La Server Action **ya la acepta** (lee `g{i}_prizes`, valida 0–6), pero **ningún formulario envía ese campo**. Siempre llega nula. |
| `games.turns` | No aparece en ningún formulario ni en ninguna acción. Columna muerta desde que se creó. |

Son, con diferencia, los dos datos de más valor analítico que faltan, y los dos más baratos de
conseguir: dos números por juego, en la pantalla donde ya estás apuntando el resultado.

- **Premios restantes** es el margen de victoria. Convierte «gané» en «gané 6-1» o «gané 6-5»,
  que son partidas completamente distintas. Con eso se puede decir si un emparejamiento es
  favorable o solo ligeramente favorable, que es la pregunta que de verdad se hace antes de un
  torneo.
- **Turnos** es la duración. Con eso sale el riesgo de empate por tiempo, que en Bo3 decide
  rondas enteras, y se puede ver qué mazos de los vuestros van justos de reloj.

**Mulligans ya se apunta** (`mulligansA` / `mulligansB`, con campo en `MatchForm`), pero no se
usa en ninguna estadística. Es la tercera pieza gratis: ya la tenéis guardada.

### Lo que falta y hay que decidir si merece la pena pedirlo

Ordenado por relación entre lo que cuesta teclearlo y lo que da:

1. **Quién eligió empezar** (`first` ya guarda quién empezó, no si lo eligió). En Pokémon el
   ganador del sorteo decide, y saber cuántas veces se elige salir segundo con según qué mazo
   es información real. Coste: un interruptor por juego.
2. **Motivo del final**: premios, deck-out, concesión, tiempo. Cuatro botones. Separa «perdí la
   partida» de «perdí el reloj», que no se arreglan igual.
3. **Pokémon inicial** (el activo del turno 1). Coste alto de teclear, valor alto para un mazo
   concreto. Candidato a dejarlo opcional y solo en liga, no en torneo.
4. **Hora de la ronda**. Ya hay `tournaments.start_time`; con la hora de cada ronda sale el
   rendimiento según la hora del día, que es una de las cosas que la gente sospecha de sí misma
   y nunca puede comprobar.

### La regla que hace que esto funcione

**Todo campo nuevo es opcional y se apunta en la misma pantalla, sin un paso más.** Un
formulario que pide ocho cosas para registrar una partida acaba sin usarse, y entonces el dato
que tienes es peor que el de antes: tienes huecos y no sabes si el hueco significa «cero» o «no
lo apunté». Por eso:

- Nulo y cero no son lo mismo, y la interfaz lo enseña distinto (un guion, no un «0%»). Esto ya
  se decidió en la v0.10 para `cutRate` y vale igual aquí.
- Cada gráfica que use un campo opcional dice **sobre cuántas partidas** está calculada. Sin
  eso, un 80% sobre 5 juegos se lee igual que un 80% sobre 300.
- Un mínimo de muestra antes de afirmar nada, asimétrico como en `metaBadges`: cuesta más decir
  que algo falla que decir que algo funciona.

---

## Parte 2 · Cómo se recorren los datos

Esto es lo que de verdad separa «tengo gráficas» de «puedo investigar algo», y **no depende de
la librería**: es arquitectura de la app.

### Filtro cruzado por URL

Ya tenéis la mitad hecha: `src/lib/filters.ts` y el panel de filtros por querystring. Lo que
falta es que **tocar un elemento de una gráfica sea navegar**.

Pinchar la barra de Dragapult en «Rendimiento» debería llevar a
`/resultados?arquetipo=a-dragapult`, y pinchar un mes de la conversión a
`/resultados?desde=…&hasta=…`. El filtro ya existe, la URL ya existe, falta cablear el `onClick`
a un `Link`.

Esto es barato, se nota muchísimo, y encaja con la regla de que el filtro viaja en la URL: el
enlace se comparte, la vuelta atrás funciona y sigue funcionando sin JavaScript.

### Vistas enlazadas

Una pantalla de análisis donde el filtro de arriba manda sobre todas las gráficas de abajo, y
donde cada gráfica puede *añadir* al filtro. Estadísticas ya va por ahí; lo que falta es que el
estado sea uno solo y viva en la URL, no uno por componente.

### Profundizar, no apilar

En vez de añadir gráficas nuevas a Estadísticas hasta que no quepan, cada bloque lleva a una
ficha: arquetipo → su ficha, con sus emparejamientos, su evolución y sus partidas. Es la forma
de que la pantalla principal no crezca sin parar.

---

## Parte 3 · La librería

### Recomendación: **quedarse con Recharts 3 y no añadir una segunda**

Recharts 3.10 ya hace barras, líneas, áreas, dispersión, radar, compuestos, pinceles de rango,
referencias y tooltips a medida. De todo lo que hay en este plan, lo único que no hace bien son
las matrices y los diagramas de flujo.

Añadir una segunda librería general (nivo, ECharts, Chart.js) traería dos estéticas, dos APIs y
el doble de JavaScript al móvil. El coste no es económico —la transferencia de Vercel sobra de
largo— sino de tiempo de carga en el móvil y de mantenimiento.

### Para lo que Recharts no hace: SVG propio

La matriz de enfrentamientos (`H2HHeatmap`) y el marcador de arquetipos «Other» ya están hechos
así y funcionan. Un mapa de calor es una rejilla de rectángulos con un color: son treinta
líneas de SVG, con control total del tamaño táctil y del contraste, y sin dependencias.

La regla que ya tenéis y conviene mantener: **los colores salen de variables CSS**, para que el
tema oscuro funcione solo.

### Dónde sí consideraría algo más

- **Observable Plot**, solo si algún día quieres una pantalla de exploración libre donde se
  elijan ejes al vuelo. Es declarativa y muy compacta para eso. No la metas para sustituir lo
  que ya funciona.
- **`visx`** si llegaras a necesitar una visualización muy a medida; pero es un juego de piezas,
  no una librería de gráficas, y cuesta más de lo que parece.

No es el momento de ninguna de las dos.

### Lo que sí falta en la capa visual, y no es una librería

1. **Carga diferida ya está** (`components/statistics/lazy.tsx`): mantenla para cualquier
   gráfica nueva. Recharts es grande y no debe entrar en pantallas que no lo usan.
2. **Accesibilidad táctil**: los puntos y barras deben tener 44 px de objetivo. En móvil, un
   punto de 4 px no se puede tocar.
3. **Tabla debajo de cada gráfica**, plegada. Es lo que hace una visualización verificable: si
   alguien discute un número, lo puede leer. También resuelve el daltonismo y el lector de
   pantalla de una vez.
4. **Nada que dependa solo del color**: forma, posición o etiqueta además del color.

---

## Orden propuesto

| | Qué | Por qué primero |
| --- | --- | --- |
| 1 | Campos de **premios restantes** y **turnos** en el formulario de juego | Son dos números; la columna ya existe y la acción de premios ya los acepta. Sin esto, lo demás pinta lo mismo de siempre. |
| 2 | **Filtro cruzado**: pinchar una barra navega al Resultados filtrado | Barato, ya está casi todo, y cambia por completo la sensación de la app. |
| 3 | **Margen de victoria** en la matriz de emparejamientos y en la ficha de arquetipo | Primera cosa nueva que se puede contar con el dato del punto 1. |
| 4 | **Ficha de arquetipo** como pantalla propia | Es donde cabe todo lo que no cabe en Estadísticas. |
| 5 | Mulligans y riesgo de empate por tiempo | Mulligans ya está guardado; los turnos llegan con el punto 1. |
| 6 | Resto de campos de captura (motivo del final, elección de salida) | Solo si los dos primeros se usan de verdad durante un mes. |

El punto 6 lleva esa condición a propósito: si en un mes nadie rellena premios y turnos, la
respuesta no es pedir más campos, es quitar los que no se usan.
