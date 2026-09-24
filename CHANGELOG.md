# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## [0.11.0] — 2026-09-23

Filtros que se suman, el corte explicado en dos cifras, y una corrección importante de
etiquetado. **No toca la base de datos.**

### Corregido

- **Las pestañas de la portada se cortaban.** «Clasificación», «Metajuego» y «Tus CP» usaban
  la clase `.scroll-x`, que lleva un margen negativo para que el contenido ancho llegue de
  borde a borde de la *página*. Pero viven dentro de una tarjeta con `overflow-hidden` —la que
  redondea las esquinas—, así que ese margen las sacaba 16px por cada lado y el recorte se
  comía la primera y la última. Ahora llevan desplazamiento normal con relleno por dentro.
- **Deslizar una tabla ancha hasta el final ya no te saca de la página**
  (`overscroll-x-contain` en la tabla de conversión, como ya tenía la matriz).
- Punto de corte nuevo `xs` (400px): el salto de «móvil» a 640px era demasiado grande para las
  filas densas. En la clasificación de la portada, el récord se esconde por debajo de ahí.

### Cambiado

**El metagame de Limitless es ONLINE, y ahora lo dice**
- Comprobado contra su API el 23/09/2026: los veinte torneos más recientes son «Pudding
  Weekly #14», «CrownOfSpain #8», «Torneo Relámpago ⚡ #82»… Es su **plataforma de torneos por
  internet**. Los Regionales presenciales están en otra web suya que no tiene API.
- Llamarlo «meta mundial» vendía otra cosa. Pasa a llamarse **«Meta online»** en la pestaña,
  en los títulos y en los textos, con una nota que lo explica en Top Decks. Sigue sirviendo
  como foto del metagame —son miles de listas a la semana— pero ya no se confunde.

**La fuente de Estadísticas afecta a toda la página**
- Con «Meta online» ya no se quedan debajo la matriz de emparejamientos, el primer turno, la
  actividad por mes ni el rendimiento por mazo: esas salen de **vuestras** partidas y no
  existen fuera. Se ocultan y una línea dice por qué, en vez de quedarse ahí dando a entender
  que el filtro no funciona.

**Filtros múltiples en la conversión de Inicio**
- Se pueden marcar varios tipos de torneo a la vez, y cada chip encendido lleva una × para
  quitarlo.
- Se **suman** (o uno u otro), y no es un descuido: dentro de la misma dimensión, pedir
  «regional Y cup» no devolvería nunca nada, porque un torneo tiene un solo tipo. El «y» entre
  dimensiones distintas —tipo y fecha— sí se cumple.

**Orden ascendente y descendente en los gráficos**
- Control en «Uso del metagame», «Rendimiento», «Victorias por arquetipo», «Qué mazos llegan
  al corte» y la conversión de Inicio. Descendente por defecto.
- Los arquetipos **sin dato** se quedan siempre al final, en los dos sentidos: un mazo sin
  conversión calculable no es «el peor», es que no hay nada que ordenar.

**Camino al corte, en dos cifras**
- **Entrada segura** y **Depende del desempate**, cada una en su tarjeta con el récord en
  grande, en vez de un párrafo de texto corrido.
- De todos los finales que se quedan fuera se enseña **solo el mejor**, y se dice cuántos
  había detrás. Diez filas diciendo «así no entras» enterraban las dos que importan.

### Añadido

**Pestaña «Último torneo»**
- El torneo online más grande de los últimos catorce días (64 personas para arriba), con el
  top 8 y su mazo, y por arquetipo: **play rate**, **% de victorias** y **conversión al
  corte**. Tres preguntas distintas — cuánto te lo cruzas, si aguanta, si cierra.
- El tamaño del top cut se deduce de las fases que devuelve la API: si hay una fase que no es
  suizo, sus rondas son el logaritmo del corte (3 rondas = top 8). Tolerante a nombres nuevos:
  lo que se mira es que **no** sea suizo.
- Se pidió como «Último Regional». No se puede: eso exigiría raspar su web. Está explicado en
  la pantalla y en `src/lib/sources/limitless.ts`.

**Marcador propio para «Other»**
- Limitless mete en «Other» todo lo que no llega a arquetipo propio, y salía como un sprite
  roto. Ahora lleva un marcador nuestro: tres cartas apiladas en un círculo de trazo
  discontinuo, en las listas y también dentro de los ejes de los gráficos.
- **No es el Substitute** de Limitless, por dos razones: su CDN no lo sirve
  (`…/gen9/substitute.png` da 404, y las variantes que probé también), y dibujarlo a mano
  sería copiar un diseño de Pokémon.

### Pruebas

- 122 en total (9 nuevas): el resumen de los finales perdidos y el lector de fases de
  Limitless, con el caso de las fases de dos días y el de un nombre de fase desconocido.

## [0.10.0] — 2026-09-23

Medallas, conversión a top cut y una limpieza. **Toca la base de datos**: una columna nueva y
una tabla que desaparece.

### Añadido

**Medallas de gimnasio**
- Nueve medallas, con bronce, plata y oro cada una, en el perfil. Se calculan solas de lo que
  ya hay: partidas, victorias, racha, arquetipos distintos, listas guardadas, torneos, cortes,
  CP y rondas anotadas con el turno inicial. Nadie las concede y nadie las quita.
- **Se ven todas, ganadas o no**, con lo que falta debajo: «te faltan 2 victorias». Una
  vitrina con huecos es la mitad de la gracia; una que además dice qué falta es lo que hace
  que alguien registre la partida.
- Ninguna depende de los demás. En un grupo de cinco, una medalla por ser el primero del
  ranking es una alegría y cuatro frustraciones: todo se mide contra uno mismo.

**Conversión: cuántas veces que vas, llegas**
- Motor nuevo en `src/lib/tournamentStats.ts` con cuatro cifras —conversión al top cut,
  top 8, top 4 y torneos ganados— y sus pruebas.
- **El denominador del corte va aparte**, y es el detalle que hace que el número signifique
  algo: la conversión solo se calcula sobre torneos que **tenían** top cut. Un Challenge de
  12 personas sin corte no cuenta como corte fallado. Cuando no hay nada que medir sale un
  guion, no un cero: «todavía no hay dato» y «cero por ciento» no son lo mismo.

**En Inicio: ranking de conversión**
- Tabla nueva con %Cut, %Top 8, %Top 4, %Ganados, %V de partidas y victorias, por jugador,
  con **filtro por tipo de torneo** por URL. En móvil son tarjetas: seis columnas de
  porcentajes en 375px no se leen.

**En Estadísticas: qué mazos llegan al corte**
- La misma tabla por arquetipo, respetando los filtros que ya había arriba, y debajo una
  gráfica de la conversión **mes a mes**.
- Por mes y no por torneo a propósito: con un punto por torneo cada valor es un 0% o un 100%
  y la línea es un electrocardiograma. Los meses sin torneos no se rellenan con ceros, que
  dibujaría caídas que no han pasado.

**En el perfil: mejores resultados**
- Los cuatro mejores puestos, como los que salen debajo del nombre en el stream. A igual
  puesto manda el torneo más grande: un top 8 de 300 personas no es un top 8 de 20.
- Encima, las cuatro cifras de conversión de esa persona.

**Reiniciar el Elo**
- Ajuste **«Contar el Elo desde»** y un botón de «empezar de cero hoy».
- No borra nada, y esto importa: el Elo no está guardado en la base, se recalcula desde las
  partidas en cada carga. Poner una fecha hace que todos vuelvan al Elo inicial y se
  reconstruya desde ahí; quitarla devuelve el ranking anterior exactamente como estaba.

### Corregido

- **El ranking no enseñaba el avatar.** La tabla recibía `avatarKind` y `avatarValue` y **no
  los usaba**: pintaba un círculo con la inicial, así que quien tenía un Pokémon o una foto no
  la veía. Es una pantalla de cliente —ordena sin recargar— e importar el `Avatar` se llevaría
  `lib/stats` y `lib/pokemon` al navegador, así que el avatar se pinta en el servidor y viaja
  ya hecho, como ya hacían las gráficas de la portada.
- **El récord se escribía V–E–D y se dice V–D–E.** Un «3–1» son tres victorias y una derrota.
  Cambiado en el componente `Record` —y con él en las seis pantallas que lo usan— y en la
  tabla del ranking. El empate solo aparece cuando lo hay.

**Móvil**
- **El zoom al enfocar un campo.** Safari en iPhone amplía solo en cuanto un `input`, `select`
  o `textarea` baja de 16px, y luego no vuelve. El cuadro de la lista y el buscador de mazos
  iban a 14px. Ahora todos los campos van a 16px en pantallas táctiles.
- **La barra de arriba cortada al alejar el zoom.** La causa era el desbordamiento horizontal:
  basta con que un elemento se salga por la derecha para que el documento sea más ancho que la
  ventana, y entonces la cabecera `sticky` —que solo mide el ancho de la ventana— deja de
  cubrir la derecha. Se ve como una barra cortada. Ahora `html` y `body` recortan con
  `overflow-x: clip`, que a diferencia de `hidden` no rompe el `sticky` de los hijos. Lo que
  es ancho a propósito —la matriz, las tablas— sigue desplazándose con el dedo.
- El teclado ya no empuja la cabecera fuera de la pantalla (`interactiveWidget`).
- La barra de desplazamiento reservada solo se aplica donde hay ratón; en el móvil era una
  franja muerta que estrechaba el contenido.
- Los títulos largos de las tarjetas ya no ensanchan la página.

### Quitado

- **Pokémon TCG Live.** Fuera la pantalla, el importador, las acciones, las pruebas, la
  entrada del menú y la tabla. La razón es la que dio Ibai y es buena: TCG Live no tiene
  ninguna forma de exportar el historial de partidas, así que lo único posible era teclearlo a
  mano, y eso no lo hace nadie dos semanas seguidas. Mejor no tenerlo que tenerlo vacío.

### Base de datos

- `settings.elo_since` (fecha, nula = desde el principio).
- `DROP TABLE ptcg_live_matches`. **Irreversible**: si habías importado algo y lo quieres,
  sácalo antes.
- `npm run db:push`, o `drizzle/0006_v0_10_0.sql` a mano.

### Pruebas

- 113 en total: 24 nuevas del motor de conversión y de las medallas; fuera las 25 del
  importador de TCG Live.

## [0.9.1] — 2026-09-22

Arreglo del build. La v0.9.0 no compilaba.

### Corregido

- **`pairRound` dejó de compilar al pasarle `snap.config`.** La culpa es de cómo se añadió
  `eloScope` en la v0.8.0: se puso en `DEFAULT_SETTINGS` con el tipo estrecho
  (`"competitive" as EloScope`), y `pairRound` toma `cfg = DEFAULT_SETTINGS` **sin anotar el
  parámetro**, así que TypeScript le dedujo ese tipo. `snap.config` trae `eloScope: string`
  —la columna es `text`— y `string` no es asignable a `EloScope`.

  Dos arreglos, porque uno solo tapa el síntoma:
  - `DEFAULT_SETTINGS.eloScope` pasa a ser `string`. Es lo correcto: ese objeto hace de
    sustituto de `Settings`, y allí la columna es `text`. El estrechamiento se hace donde
    toca, en `asEloScope()`.
  - `pairRound` anota su `cfg` explícitamente con los cuatro campos que de verdad usa, en vez
    de heredar el tipo del valor por defecto. Un parámetro que se infiere de un objeto
    literal es una trampa esperando a que alguien añada un campo.

- **Los ejes con sprites, escritos de otra forma.** `tick={<TickSpriteX …/>}` pasaba un
  elemento con props propias donde Recharts declara «elemento SVG o función que devuelve
  uno». Ahora va como función —`tick={(props) => <TickSpriteX {...props} …/>}`— y los dos
  componentes de tick devuelven `<g />` en vez de `null` cuando no hay fila. No cambia nada de
  lo que se ve.

- **Las pruebas del corte ya no dependen de que `assert.ok` estreche el tipo.** Eso funciona
  solo si TypeScript ve la firma `asserts value` de `@types/node`, y `next build` también
  tipa la carpeta `tests/`. Hay un ayudante `noNulo()` que comprueba y devuelve el valor ya
  no nulo.

### Nota

Aquí no se puede ejecutar `npm run build`: el registro de npm está capado en este entorno y
no hay forma de instalar `next`, `drizzle-orm` ni `@types/react`. Sin esos tipos, un `tsc`
local ve medio proyecto como `unknown` y estos tres fallos quedaban escondidos entre el ruido.
Lo que sí se ejecuta y se ejecutó: las 118 pruebas y el comprobador estático de imports.

## [0.9.0] — 2026-09-21

El arreglo de los CP que no aparecían, el calendario en color y el orden de los torneos.
**Toca la base de datos**: cuatro columnas nuevas en `events`.

### Corregido

**Los CP que seguían a cero después de poner la asistencia**
- La causa, y no era la que parecía: el recálculo **ya existía** —`saveTournament` rehacía los
  CP al editar un torneo—, pero **tres pantallas leían la columna `cp_earned` en crudo** en
  vez de calcular. Esa columna es una caché que se rellena al guardar; cualquier camino que
  cambiara la asistencia sin pasar por el formulario de editar la dejaba vieja, y entonces el
  perfil —que sí recalcula— y la ficha del torneo decían cifras distintas.
- Ahora hay `effectiveCp()` en `src/lib/cp.ts` y **ninguna pantalla lee la columna**: la lista
  de torneos, la ficha y el perfil calculan del tipo, el puesto y la asistencia de ahora. Ya
  no pueden discrepar. La columna sigue existiendo como caché y para los valores puestos a
  mano, que mandan siempre.
- El recálculo al guardar se ha sacado a un ayudante, `recalcTournamentCp()`, para que lo
  usen los dos caminos que existen ahora.

### Añadido

**«¿Cuánta gente hubo?» en la ficha del torneo**
- Un campo y un botón, ahí donde se mira, en vez de enterrado en el formulario de editar con
  otros veinte campos. Eso es lo que hacía que no se rellenara nunca. Lleva también rondas
  suizas y top cut, que alimentan el «Camino al corte».
- Y lo que de verdad cambia el comportamiento: **dice cuántos CP se está dejando cada uno**.
  «Falta la asistencia» se ignora; «Ibai se está dejando 6 CP» no. Con el nombre, el puesto,
  el 0 → 6 y la gente que haría falta.
- Cuando la asistencia está puesta y nadie pierde puntos, el panel **no se pinta**. Que
  desaparezca es la señal de que está todo bien.
- `explainCp()` distingue los tres motivos de un cero: sin puesto, sin asistencia, o el
  kicker que no llega. El del medio es el que confunde a todo el mundo y ahora se explica.

**El calendario, en color y filtrable**
- Cada tipo de evento tiene su color, de la paleta de series de `globals.css` —la que está
  validada para daltonismo y tiene versión clara y oscura—. Mundial, Internacional, Regional,
  Special Event, Cup, Challenge, tienda, online.
- **Filtro por tipo**, por URL como el resto: el enlace se comparte y la vuelta atrás
  funciona. Solo salen los tipos que de verdad hay; ofrecer «Mundial» sin ninguno es ruido.
- Los eventos de **varios días** ocupan varios días. Un Regional es sábado y domingo, y hasta
  ahora solo salía el sábado.
- La agenda de la derecha incluye ahora también los torneos apuntados, con enlace a su ficha,
  y ordena por cercanía.

**Los eventos oficiales de Europa de la temporada 2027**
- Botón en el calendario (para organizadores): mete de una vez los diez Regionales, Special
  Events y el Internacional de Europa.
- La lista está **escrita a mano** en `src/data/eventos-europa.ts`, con sus fuentes al lado.
  No se consulta ninguna web: para diez eventos al año no hace falta, y con las webs de las
  que salen no sería correcto.
- Idempotente: cada evento lleva un id fijo, así que se puede pulsar las veces que haga
  falta, y corregir el fichero y volver a importar.
- Donde las fuentes no coinciden, se dice. El Internacional de Europa va marcado como «fecha
  por confirmar»: Serebii da 19–21 de febrero y PokéBeach da 13–15, que resulta ser
  exactamente la fecha del Internacional de 2026.

### Cambiado

**El orden de la lista de torneos**
- Antes salía el más nuevo arriba, que para un histórico está bien pero no para esta
  pantalla. Ahora es orden de agenda: **primero lo que viene, del más cercano al más lejano**;
  detrás lo ya jugado, del más reciente al más antiguo. Lo de hoy, lo primero de todo.
- Cada fila lleva «en 3 días» / «hace 2 semanas», que con este orden es lo que de verdad la
  sitúa, y el título dice cuántos hay por delante.
- El comparador es `byAgenda(hoy)` en `src/lib/format.ts`: puro, con la fecha de hoy como
  argumento para poder probarlo sin tocar el reloj.

### Base de datos

- `events.end_date`, `events.tournament_kind`, `events.location`, `events.url`. Las cuatro con
  valor por defecto, así que lo que ya existe no se toca.
- `npm run db:push`, o `drizzle/0005_v0_9_0.sql` a mano. Idempotente.

### Pruebas

- 118 en total (106 antes, 12 nuevas): el caso «15.º con 25 personas son 6 CP» está ahora
  escrito como prueba, junto con los tres motivos de un cero, el respeto al valor manual, la
  diferencia entre las tablas de 2026 y 2027, y el orden de agenda.

## [0.8.0] — 2026-09-21

Lo que quedaba pendiente de `CAMBIOS (6).docx` y de los tres paquetes del 19 y el 20 de
septiembre. **Esta versión toca la base de datos**: hay que aplicar la migración antes de
desplegar.

### Añadido

**Camino al corte** — la petición del 19/09
- En la ficha de un torneo abierto, entre ronda y ronda: con tu récord, las rondas que quedan
  y la gente que hay, qué hace falta para entrar en el top cut. Con el reparto de empates,
  porque un 3-1-1 no son los mismos puntos que un 4-1.
- La línea de corte **se calcula, no se copia de una tabla**. En un suizo el número de gente
  con k victorias sigue una binomial, así que sumando de arriba abajo sale cuántos caben por
  encima de cada marca. Con 32 personas, 5 rondas y top 8 da: entra el 4-1, el 3-2 es burbuja.
  Que es lo que pasa de verdad. La aritmética y sus límites están explicados en
  `src/lib/cut.ts`.
- Debajo, lo que da cada puesto **con la asistencia de ese torneo**, con el kicker aplicado.
  Los tramos que no llegan al mínimo de gente salen en gris a 0 CP, que es lo que pasa y lo
  que confunde a todo el mundo la primera vez.
- No se enseña si falta la asistencia o el número de rondas: sin esos dos datos no hay línea
  que estimar, y una cuenta inventada sería peor que nada.

**Pokémon TCG Live** — la petición del 19/09
- Pantalla nueva con tu historial del cliente: importar, ver cómo va cada mazo y contra qué
  estás perdiendo.
- **TCG Live no tiene API, ni exportación, ni la va a tener.** Así que es un importador de
  texto pegado, escrito para tragar lo que la gente apunta de verdad: comas, punto y coma o
  tabuladores (pegar desde una hoja de cálculo funciona tal cual), con cabecera o sin ella,
  fechas en tres formatos, y `V/D/E`, `W/L/D` o el marcador. Si hay marcador y letra y no
  cuadran, manda el marcador.
- La previsualización se calcula en el navegador mientras escribes, con el mismo parser; lo
  que se guarda sale de volver a interpretarlo en el servidor.
- Volver a pegar la hoja entera no duplica nada. La clave de deduplicación se guarda **en
  claro** y no como hash: hace lo mismo y además se puede leer cuando algo no cuadra.
- Estas partidas **no entran** en el ranking, el Elo ni los CP: las apunta una sola persona y
  contra desconocidos, así que no son verificables. Van a su propia tabla.

**Top Decks** — del paquete del 20/09
- Pantalla nueva: los mazos más jugados del mundo, con cuota de metagame, % de victorias,
  **% de listas que llegan a top 4**, victorias de torneo y el mejor resultado de la ventana.
- El top 4 es la columna que justifica la pantalla: distingue un mazo que gana rondas de uno
  que cierra torneos, y eso ni la cuota ni el %V lo dicen.
- Marca cuáles de esos mazos tenéis ya dados de alta en vuestro catálogo.
- Filtros de formato y de ventana (14 / 30 / 90 días). Solo torneos de 16 personas para
  arriba: por debajo son ruido.
- Sale de la API pública de Limitless. **El paquete de origen proponía Express + Prisma +
  cron jobs**; nada de eso hace falta, porque el cliente de Limitless ya existe y la caché ya
  estaba puesta en los `fetch`.

### Cambiado

**El Elo deja de contar los amistosos** — `ELO-SOLO-TORNEOS.md`
- Ajuste nuevo en Ajustes con tres valores. Por defecto **liga y torneos**.
- Por qué no «solo torneos», que era lo que pedía el documento al pie de la letra: en Arena
  una partida puede ser de competición interna, de torneo, o suelta. Excluir la liga interna
  dejaría el Elo alimentado solo por los eventos a los que va cada uno por su cuenta —pocos y
  no todos—, y el ranking se quedaría plano. Lo que se pidió fue que no contaran los
  amistosos, y eso es exactamente lo que hace el valor por defecto. «Solo torneos» sigue
  estando para quien quiera la versión estricta.
- No hay nada que migrar: el Elo se recalcula entero desde las partidas en cada carga, así que
  el cambio se ve en la siguiente pantalla y se deshace igual de rápido.

**«Victorias por arquetipo» con sprites** — la petición del 16/09
- El eje X de la gráfica lleva ahora el dibujo del Pokémon en vez del nombre recortado a doce
  caracteres. Es la misma decisión que ya se tomó en la matriz: «Marnie's Grimmsnarl ex»
  girado 35 grados ocupaba 56 píxeles de alto y seguía sin leerse. El nombre sigue en el
  globito y en el recuadro de la barra.
- La gráfica de cuota hace lo mismo, con sprite y nombre, que en vertical sí cabe.

**Filtro de ámbito en el Ranking** — la petición del 19/09
- Fila nueva de filtros: Todo · Liga · Presenciales · Online · Amistosos, más un interruptor
  de «Temporada 2027». Por URL, como el resto: se comparte y la flecha de atrás funciona.
- Los ámbitos salen de `src/lib/filters.ts`, los mismos que Resultados y Estadísticas, así que
  «presencial» quiere decir lo mismo en las tres pantallas. Dos ámbitos nuevos —`onsite` y
  `online`— que parten los torneos por `tournaments.scope`.

### Base de datos

- `settings.elo_scope` (texto, por defecto `competitive`).
- Tabla `ptcg_live_matches`, con índice por jugador y `dedupe_key` única.
- `npm run db:push`, o `drizzle/0004_v0_8_0.sql` a mano. Es idempotente.

### Pruebas

- 106 en total (59 antes, 47 nuevas): 22 de la calculadora de corte y 25 del importador de
  TCG Live. Incluyen el caso de manual —32 personas, 5 rondas, top 8— que es el que valida
  el modelo entero de la línea de corte.

## [0.7.0] — 2026-09-21

La versión de la capa visual. Ninguna pantalla cambia de sitio; lo que cambia es cómo se
comporta mientras carga, cómo se rompe cuando se rompe, y cómo se maneja con el dedo.

### Añadido

**Se ve algo mientras carga**
- Esqueletos de carga con la forma del contenido, no un «cargando» centrado: uno por defecto
  para todo el grupo `(app)` y tres a medida —Estadísticas, Ranking, Resultados y Torneos—.
  Importa más de lo que parece: en Vercel y Neon gratis, la primera consulta después de un
  rato despierta la base de datos y tarda uno o dos segundos. Antes eso era una pantalla en
  blanco, que se lee como una web rota.
- El bloque del metagame mundial ya no enseña dos barras grises: enseña el hueco exacto de
  las cuatro cifras y la gráfica que van a salir, así que al llegar el dato no salta nada.

**Pantallas de error propias**
- `error.tsx` con botón de **reintentar** de verdad —vuelve a renderizar solo esa parte del
  árbol, sin recargar—, que es lo que hace falta cuando el fallo es la base de datos
  despertándose. Enseña el `digest` para poder buscarlo en los registros de Vercel, y **no**
  el mensaje del error: un mensaje de una consulta puede llevar dentro nombres de tabla.
- `not-found.tsx` en dos sitios: uno para una URL que no existe y otro para algo que existía
  y se ha borrado.
- `global-error.tsx`, el de último recurso, el único fichero de la app que pinta su propio
  `<html>` y lleva los colores escritos a mano, porque cuando se muestra ya no hay hoja de
  estilos que valga.

**Buscador de cartas**
- En el editor de mazos, nuevo y existente: escribes «dragapult» y salen las cartas con su
  set, su número y su imagen, y un toque copia la línea de decklist ya formateada
  —`1 Dragapult ex TWM 130`—, que es justo donde se cuelan las erratas al escribirla a mano.
- Va contra `pokemontcg.io` a través de `/api/cards`, detrás de la sesión para que nadie use
  el despliegue de la liga como proxy gratis. Espera 400 ms a que dejes de teclear y cancela
  la petición anterior, porque sin clave el límite son 30 peticiones por minuto.
- Si la API no responde, el buscador lo dice en una línea y ya está: es una ayuda, no un
  requisito. Nada de lo demás depende de ella.

**Cifras del metagame mundial**
- Cuatro KPIs nuevos encima de las gráficas de Estadísticas cuando la fuente es mundial o
  comparación: torneos y listas mirados, mazo más jugado, victorias medias **ponderadas por
  número de listas** —sin ponderar, un mazo con tres apariciones pesaría lo mismo que uno con
  cuatrocientas— y, en modo comparar, el mayor desvío entre vuestra liga y el mundo.

**En Ajustes**
- Un panel de **fuentes externas** que dice, sin enseñar ninguna clave, si hay clave
  configurada para cada API y qué pasa si no la hay. Incluye la fecha en la que pokemontcg.io
  deja de funcionar: 1 de marzo de 2027.

### Cambiado

**Móvil**
- La pestaña activa de la barra inferior lleva **pastilla**, no solo color. A pleno sol el
  color se pierde; la forma no. Y esto se usa de pie, en un torneo, con el móvil en la mano.
- La cabecera respeta la **muesca** y el contenido respeta la **barra de gestos**: antes, con
  `viewportFit: "cover"`, en un iPhone el título quedaba medio tapado y la última fila de
  cualquier lista caía debajo de la rayita de abajo.
- El aviso de abajo (snackbar) sube por encima de las dos cosas. Antes se solapaba con las
  pestañas justo cuando más se mira: al guardar algo.
- La **matriz de emparejamientos** ya no dispara el «atrás» del navegador al deslizarla hasta
  el final, y la primera columna se ve flotar sobre el resto en vez de parecer una raya más.
- Botón de **volver** en las pantallas de detalle que no lo tenían (mazo, mazo nuevo, partida
  nueva, torneo nuevo, tu perfil). Solo en móvil: en escritorio está la barra lateral.

**Escritorio**
- Barra de desplazamiento del color del tema, con su hueco reservado siempre para que el
  contenido no salte 15 px al pasar de una página corta a una larga.
- Texto seleccionado con el color de la marca.
- Las tarjetas pulsables se levantan con el ratón y se hunden con el dedo.

**Por dentro**
- Tres niveles de **sombra en variables** (`--shadow-1/2/3`), con valores distintos en claro y
  en oscuro: sobre fondo oscuro una sombra suave no existe, así que allí son más duras y
  llevan un filo claro arriba.
- `Kpi` acepta `tone` e `icon`, y una `delta` en puntos con su flecha. Los tonos son los
  mismos tres colores de fuente que usan las gráficas —azul lo vuestro, naranja el mundo,
  morado la diferencia—, para no tener que aprender dos leyendas.
- **`src/components/primitives.tsx`**: `Kpi` y los esqueletos se han sacado de `ui.tsx` a un
  fichero sin dependencias. `ui.tsx` importa `lib/stats` (ochocientas líneas) para pintar una
  partida, y un componente de cliente que solo quisiera un `Kpi` se lo llevaba entero al
  navegador. `ui.tsx` los reexporta, así que ninguna pantalla existente cambia.
- `Icon` acepta `style`, y hay seis iconos nuevos.

### Documentación

- **README reescrito** para la v0.7.0, absorbiendo el apéndice de la v0.5.0 —que se borra— y
  con tabla de variables de entorno, estructura de carpetas al día y una sección sobre cómo
  está montado el diseño.
- `.env.example` documenta las dos variables opcionales de fuentes externas.

## [0.6.0] — 2026-09-16

El snackbar por fin aparece, los filtros filtran, y las estadísticas pueden mirarse contra el
metagame mundial en vez de solo contra vosotros mismos.

### Corregido

- **El snackbar no salía nunca.** El componente existía desde la v0.5.0 y seis acciones ya
  dejaban su mensaje, pero **no estaba montado en ninguna parte**: faltaba ponerlo en el layout.
  Era eso y nada más. Ahora vive en `src/app/(app)/layout.tsx`, dentro de un `<Suspense>`
  —obligatorio, porque usa `useSearchParams` y sin él `next build` falla al prerenderizar—.
- Los filtros de **fecha y tipo en Estadísticas** estaban puestos pero no tocaban lo que se
  pintaba.

### Añadido

**Avisos en todas las acciones**
- Crear y guardar mazos, borrarlos (con su matiz: si el mazo estaba en uso se **retira** en vez
  de borrarse, y ahora el aviso lo dice), registrar y borrar partidas, guardar el resultado de
  un torneo, ajustes, invitaciones creadas y anuladas, competiciones borradas.

**Filtros de verdad, y los mismos en todas partes**
- Las reglas viven en `src/lib/filters.ts` y las comparten Resultados, Estadísticas y el
  endpoint de la API. Antes cada pantalla tenía la suya y arreglar una no arreglaba la otra.
- Se puede filtrar por: de dónde sale la partida (liga / torneos / amistosos), **rango de
  fechas** (atajos de 30, 90 y 365 días, o dos fechas a mano), **torneo concreto**, **tipo de
  torneo**, competición concreta, tipo de competición, arquetipo, jugador y formato.
- **Resultados ya filtra por torneo**, que era la petición.
- Todo por URL: el enlace se puede compartir, la vuelta atrás del navegador funciona, y el
  panel se envía de una vez en lugar de recargar a cada toque de un desplegable.

**Estadísticas: tu liga, el mundo, o los dos**
- Selector de fuente: **Tu liga · Meta mundial · Comparar**.
- El metagame mundial sale de Limitless agregando las clasificaciones de los torneos recientes:
  cuánto se juega cada mazo y cuánto gana, sin clave.
- En modo comparación, **dónde os separáis del mundo**: los arquetipos cuya tasa de victorias
  en vuestra liga más se aleja de la global. Es la lectura que sirve para preparar un torneo.
- **Aviso honesto**: la API de Limitless **no filtra por país**. Está comprobado que el
  parámetro se ignora y devuelve el listado mundial igual, así que el meta es mundial y la
  pantalla lo dice. No hay selector de región que prometa un filtro inexistente.
- Lo local sale al instante (ya está en memoria); lo mundial tarda unos segundos y se pide
  aparte para no bloquear la pantalla.

**Gráficas con Recharts**
- Victorias por arquetipo (dos series en modo comparación) y cuota de uso. Los colores salen de
  variables CSS, así que el modo oscuro también funciona en las gráficas.

**Simulador de manos y mulligan**
- En la ficha de un mazo con lista: porcentaje **exacto** de mulligan, probabilidad de abrir con
  una carta concreta, y tiradas de 100 / 1.000 / 10.000 manos con la última mano en imágenes.
- Las probabilidades se **calculan**, no se simulan: tienen fórmula cerrada y simularlas sería
  cambiar una respuesta exacta por una aproximada. La simulación está para ver manos de verdad.
- El barajado es Fisher-Yates, y hay una prueba que lo verifica: el atajo de
  `sort(() => Math.random() - 0.5)` no reparte uniforme, y aquí lo que se mide es justo el azar.
- **Lo que la lista no dice**: una decklist pegada no marca qué Pokémon son Básicos. Se estima
  con una heurística y **se deja corregir a mano**, porque de ese número depende todo el
  porcentaje. Decirlo mal sería dar una cifra con pinta de exacta y equivocada.
- 15 pruebas nuevas (59 en total).

**Datos de carta (pokemontcg.io)**
- Cliente nuevo para buscar cartas y sus imágenes, con la advertencia metida en el propio
  fichero: esa API está **deprecada**, no admite claves nuevas y las existentes mueren el
  1 de marzo de 2027. Nada de la app depende de que responda; las imágenes de las listas
  siguen saliendo del CDN de Limitless, que no gasta cuota.

### Dependencias

Esta versión **necesita `npm install`** antes de compilar. Nuevas: `recharts` (3.10.1, ya
compatible con React 19), `lucide-react` (1.46.0), `class-variance-authority`, `cn` y
`tw-animate-css`. Queda además preparado shadcn/ui —`components.json`, `src/lib/utils.ts` y el
puente de paleta en `globals.css`— para poder añadir sus componentes con una orden, y con los
colores de Arena en vez de los suyos.

## [0.5.0] — 2026-09-15

Dos bugs de verdad arreglados, el mazo del torneo también por arquetipo suelto, la hora y el
precio del torneo, y un primer paso hacia el cuadro final: cada ronda ya sabe si es suizo o
top cut, y de qué fase.

### Añadido

**Hora de inicio y precio de entrada**
- Al crear o editar un torneo, junto a la fecha y la asistencia.
- El precio se guarda en céntimos (`entry_fee_cents`); se escribe en euros y se redondea solo.

**El mazo del torneo, también solo por arquetipo**
- Bloquear el mismo mazo para todo el torneo ya funcionaba; ahora funciona igual eligiendo
  solo el arquetipo, sin tener la lista de 60 cartas registrada. El selector de "con qué
  mazo juegas el torneo" ofrece las dos cosas en la misma lista, igual que ya pasaba con el
  mazo del rival.
- Columna nueva, `matches.archetype_a_id`, con el mismo patrón que `opponent_archetype_id`
  ya tenía para el lado del rival.

**Cada ronda sabe su fase**
- Suizo, o el nombre de la ronda del top cut —Cuartos, Semifinal, Final— según cuántas
  rondas de suizo se anunciaron y de qué tamaño es el corte. Se ve junto al número de ronda
  y en el encabezado de "Apuntar la ronda".
- Es solo la etiqueta, calculada (`roundStage()` en `src/lib/stats.ts`): no separa todavía
  day 1 de day 2 en un torneo con corte de asistencia a mitad. Queda anotado en "pendiente".

**Snackbar de feedback**
- Aviso al crear, guardar, cerrar o borrar un torneo, y al guardar o borrar una ronda:
  "Torneo creado.", "Ronda 3 guardada.", "Torneo cerrado."… El mensaje viaja en la URL del
  redirect (`?flash=tipo:mensaje`, `src/lib/flash.ts`) porque una Server Action que hace
  `redirect()` no tiene ningún otro sitio donde dejarlo, y se limpia solo de la URL para que
  recargar o volver atrás no lo repita.
- Cubre las acciones tocadas en esta versión; el resto queda documentado en
  `IMPLEMENTAR-v0.5.0.md` para extenderlo con el mismo patrón.

**Dos estadísticas nuevas**
- **Cuota de metagame** (`metaShare`): qué % de las apariciones en mesa es cada arquetipo,
  contando cada lado de cada partida por separado.
- **Rendimiento por número de ronda** (`performanceByRoundNumber`): tu % de victorias en la
  ronda 1, en la 2, en la 3… para ver si flaqueas tarde o remontas.

**League Cup y League Challenge, sin el alias en el desplegable**
- "Pokémon Cup" y "Pokémon Challenge" ya no se pueden elegir al crear un torneo: puntúan
  exactamente igual que League Cup y League Challenge (siguen siendo alias en
  `src/lib/cp.ts`) y tenerlos por separado era la confusión. Los torneos que ya existieran
  con esos tipos se migran a su equivalente.

### Cambiado

- En el perfil, la **evolución del Elo, los mazos, los enfrentamientos directos y los
  emparejamientos** suben antes que el desglose de Championship Points: son las cifras que
  cambian partida a partida, y el perfil abre con eso en vez de con un número que solo se
  mueve una vez por torneo.

### Corregido

- **Editar una ronda y ponerle el número de otra que ya existía reventaba contra la base de
  datos** (`matches_tour_round_idx`, el índice único de torneo+jugador+ronda). Ahora las dos
  rondas se intercambian: la que editas ocupa el número nuevo y la que estaba ahí se queda
  con el que tú dejaste libre.
- **Un juego marcado como empate no cortaba la ronda.** Los juegos siguientes se seguían
  pudiendo rellenar, y hacía falta marcar además "se acabó el tiempo" para que la ronda se
  resolviera. Ahora el empate basta por sí solo: los juegos de después desaparecen y la
  ronda se decide por mayoría de juegos ganados hasta ese punto (o empate si van iguales).

### Base de datos

`npm run db:push` aplica las columnas nuevas. Los CHECK y la limpieza de datos no salen del
esquema de Drizzle y están en `drizzle/0003_v0_5_0.sql`, que es idempotente.

- `tournaments`: `start_time`, `entry_fee_cents`.
- `matches`: `archetype_a_id`.
- Los torneos con `kind = 'pokemon_challenge'` o `'pokemon_cup'` se migran a
  `league_challenge`/`league_cup`.

## [0.4.0] — 2026-09-14

El ciclo del torneo puesto en orden —crear, editar, rellenar, cerrar—, los mazos convertidos en
una biblioteca de la liga, y los datos del metagame llegando solos desde Limitless.

### Añadido

**El ciclo de vida del torneo**
- Un torneo tiene ahora tres estados: **borrador → en curso → cerrado**. Se crea la cabecera
  cuando te apuntas, se abre el día del evento y se cierra cuando sale la clasificación.
  Un torneo cerrado no acepta rondas nuevas; reabrirlo es un botón, pero hay que darle.
- La ficha empieza con **qué falta por hacer**, deducido de los datos y no del estado: la
  asistencia, tus rondas, tu mazo, tu puesto. Sin esto, un torneo sin puesto podía ser «aún no
  ha terminado» o «se me olvidó rellenarlo», y son cosas distintas.
- **Crear y editar están separados del resultado.** Iban en el mismo formulario y parecía que
  ahorraba un paso, pero cuando apuntas un torneo todavía no lo has jugado. El formulario de
  edición se fue a su propia pantalla, `/torneos/<id>/editar`.
- El estado sale también en la lista de torneos, que es desde donde se navega.

**Biblioteca de mazos de la liga**
- Un mazo puede no ser de nadie: **`decks.player_id` admite nulos**, y sin dueño el mazo es de
  la liga. Sirve para lo que pedía la lista: apuntar el mazo que llevaba un rival sin tener que
  inventarle una cuenta.
- **Favoritos** por jugador (tabla `deck_favorites`). Un favorito no es propiedad: es lo que
  sale primero en los selectores.
- **Selector nuevo con buscador y sprite** en todas las pantallas donde se elige mazo. Con
  sesenta arquetipos, el desplegable nativo del móvil era una columna de sesenta líneas de
  texto; ahora se ve el dibujo y se puede escribir para filtrar.
- En una ronda de torneo, el mazo del rival se elige de la misma lista que los arquetipos: si
  alguien tiene apuntada su lista de 60 cartas, se guarda esa.

**El mazo del torneo se elige una vez**
- Se pone en tu resultado y **todas las rondas lo heredan**. En un suizo juegas el mismo mazo de
  la primera a la última; preguntarlo siete veces era invitar a equivocarse a la tercera y
  ensuciar tus propias estadísticas.
- Cambiar el mazo en el resultado ahora **baja a las rondas ya apuntadas**.

**Rellenar el resultado de dos maneras**
- **Récord de tus rondas** (se cuenta solo) o **a mano** (para el torneo de hace tres meses que
  no vas a reconstruir). No es una preferencia: son dos situaciones distintas.
- Las **rondas se proponen solas** a partir de la asistencia: un suizo de 32 son 5 rondas.

**Quién sale primero, juego a juego**
- Antes se marcaba solo en el primer juego y el resto se deducía («pierde uno, empieza el
  siguiente»). Ahora se marca en cada juego, porque en la mesa hay concesiones, penalizaciones y
  reinicios, y el dato bueno es el que viste.

**Championship Points de la temporada 2027, confirmados**
- Las tablas oficiales con sus *kickers* reales: un 2.º puesto cobra con 4 personas y un 3.º-4.º
  con 8, bastante menos de lo que hacía falta en 2026.
- **Regionales e Internacionales comparten un único límite de 5 mejores resultados.** Es el
  cambio gordo del año y la app lo dice donde toca, porque es contraintuitivo.
- Los tramos que dan **invitación directa al Mundial** —campeón de Regional, Top 4 de
  Internacional— salen marcados, al margen de los puntos.
- El CP no se enseña a secas: se explica. Un «0 CP» con el tramo delante —cuántos hacían falta y
  cuántos hubo— se entiende; solo, parece un error.
- En el perfil, el desglose por contador: los 4 mejores Challenges, las 4 mejores Cups y los 5
  mejores Regionales/Internacionales, con los que se quedan fuera marcados.

**Datos del metagame, sin salir de la web**
- Botón en Ajustes para **traer los arquetipos que falten** desde Limitless. Existía como script
  (`npm run archetypes:sync`), pero usarlo obligaba a tener el proyecto abierto en un ordenador
  con Node, así que no se hacía nunca y faltaban mazos —Grimmsnarl, sin ir más lejos—.
- El catálogo se deduce agregando las clasificaciones de los torneos recientes, **sin clave**: el
  endpoint oficial de arquetipos la pide, y solo la conceden a proyectos públicos.
- **El color de cada arquetipo se rellena solo** preguntando el tipo del Pokémon a PokéAPI. Antes
  entraban todos como incoloros y había que repasarlos a mano uno a uno.

**Perfil**
- Totales de victorias, derrotas, empates y % de victorias, con **filtro por ámbito**: todo,
  liga, torneos o amistosos. Mezclarlo todo no decía nada.
- Las dos listas de una partida se pueden ver, no solo la tuya.

### Cambiado

- La **matriz de emparejamientos** lleva sprites en las cabeceras de columna en vez de texto
  vertical: de 96 px de alto a menos de la mitad, y se lee de un vistazo.
- La pantalla de **Mazos** es ahora la biblioteca: pestañas por procedencia y buscador.

### Corregido

- Guardar el resultado de un torneo con un arquetipo elegido **fallaba con un error de servidor**
  (el id viajaba con un prefijo interno hasta una clave ajena).
- Apuntar **cualquier ronda nueva** habría fallado: el `ON CONFLICT` apuntaba a un índice parcial
  sin repetir su predicado, y PostgreSQL descarta esos índices al inferir el árbitro.
- Editar la cabecera de un torneo **te convertía en su creador**, y el creador original perdía el
  acceso a cerrarlo y editarlo.
- Editar una ronda y cambiarle el número **creaba una ronda nueva** en vez de mover la que había,
  o machacaba la que ocupaba ese número.
- Apuntar una ronda podía **sobrescribir una partida interna** etiquetada al mismo torneo con el
  mismo número, borrando al jugador B y sus juegos.
- Editar un torneo **recalculaba su temporada** desde la fecha y **borraba el país**, aunque el
  formulario no tuviera esos campos.
- Corregir la asistencia **no recalculaba los CP guardados**: el perfil decía una cifra y la
  ficha del torneo otra.
- Borrar la última ronda dejaba el **récord viejo** para siempre.
- Borrar un mazo de la biblioteca que estaban usando otros les dejaba los resultados **sin mazo,
  en silencio**. Ahora se retira en vez de borrarse.
- Un torneo cerrado **sí aceptaba** borrar rondas y recalcular el récord por una petición directa.
- El récord podía verse **de dos maneras distintas en la misma pantalla**.
- Un organizador que editaba un mazo compartido **se lo quedaba**, y el selector de jugador que
  se le enseñaba no hacía nada.
- Las rondas de otra persona se titulaban «Tus rondas» para un organizador.
- La fecha de cierre de un torneo se enseñaba en UTC y no en la zona de la liga.

## [0.3.0] — 2026-09-10

Apuntar un torneo mientras se juega, en vez de reconstruirlo de memoria al llegar a casa.
Y las tres cosas que faltaban para abrirlo al grupo: borrar de verdad, invitar sin fricción y
que el inicio se pueda mirar.

### Añadido

**Rondas de torneo, ronda a ronda**
- Un Challenge o una Cup son suizos de varias rondas, y ahora se apunta cada una por separado:
  rival, contra qué mazo, si saliste 1.º o 2.º, y si ganaste, empataste o perdiste.
- Dos formas de rellenarlo, porque el caso real es estar en el evento con dos minutos antes de
  los emparejamientos siguientes: **rápido** (cuatro toques) y **juego a juego** (el desglose,
  que es lo que alimenta la estadística del primer turno).
- Una ronda se puede guardar **abierta**, sin resultado, para apuntar el emparejamiento antes de
  jugar y cerrarla al acabar.
- El récord del torneo (`3-1-1`) se deriva de las rondas y ya no se teclea. El puesto final, los
  CP y los premios se siguen poniendo a mano, porque de tus propias rondas no se puede deducir
  en qué posición has quedado.
- Apuntar la primera ronda te inscribe en el torneo: no hace falta un paso previo.
- No hay tabla nueva. Una ronda es una fila de `matches` con `tournament_id` y `round`, que ya
  existían, más las filas de `games` que haya. La consecuencia es que la matriz de
  emparejamientos, el %V por arquetipo y la ventaja de empezar funcionan sin escribir una línea
  de estadística nueva.

**Ladder manual de rangos**
- Cada uno se pone su rango a mano en su perfil, de 1500 (Bronce IV) a 2000 (Challenger), con
  ocho tiers y divisiones IV–I en los cinco de abajo.
- Clasificación del ladder en Ranking, aparte de la de la liga y a propósito: una sale de
  vuestras partidas y la otra la escribís vosotros.
- Cada cambio deja historial en `ladder_entries`.
- **No es el Elo de la liga.** Ese sigue calculándose solo desde las partidas y no se puede
  editar. Son dos números distintos y en la interfaz se enseñan distintos.

**Gráficos en el inicio**
- Tres cortes en pestañas: evolución del Elo, reparto del metajuego con interruptor entre uso y
  %V, y Championship Points por contador con lo descartado en rayado.
- SVG y React a secas, sin dependencias nuevas: los colores salen de las variables
  `--series-1..7` que ya estaban.
- El color va pegado al jugador o al arquetipo, nunca a su puesto: una gráfica no cambia de
  colores porque alguien adelante a otro.

**Borrados**
- Borrar un torneo desde su ficha, con sus resultados y sus rondas. Solo organizadores.
- Zona de riesgo en Ajustes, solo para el propietario: vaciar una temporada, borrar todo el
  historial manteniendo a la gente, y borrar del todo a una persona.
- Todos piden escribir a mano el nombre de lo que se borra. Es el patrón de GitHub al borrar un
  repositorio, y está porque nada de esto tiene deshacer.

**Altas**
- `/registro` sin token: se pega el código de invitación (o el enlace entero, que se recorta
  solo) y se crea la cuenta. Enlazado desde la pantalla de acceso.

**Listas de mazo con imágenes**
- Interruptor texto ↔ cartas en la ficha de una partida. Las imágenes se construyen con la
  abreviatura del set y el número que ya venían en la lista interpretada, sin llamar a ninguna
  API ni guardar nada. Cada carta que no cargue cae a su línea de texto.

### Cambiado

- **Best Finish Limit de casa**: 4 mejores Challenges, 4 mejores Cups y 5 mejores Regionales,
  en lugar de 6 de cada. Está en el campo `bfl` de las tablas de `src/lib/cp.ts`.
- Filtro de torneos por persona en `/torneos?jugador=<id>`: cada uno ve los suyos con su puesto,
  su récord y sus premios. Es un parámetro de la URL y no un estado de React para que el filtro
  se pueda compartir y para que la vuelta atrás del navegador funcione.
- El mazo aparece con su sprite y no solo con su nombre, en la lista de resultados y en las
  fichas de partida.
- El formulario de editar una partida ya no cuelga justo debajo de la información: está detrás de
  un desplegable, y se abre solo si la partida está pendiente de anotar.
- El resultado final de un torneo también va detrás de un desplegable, para que las rondas
  queden arriba.
- Pestañas con transición: el subrayado se desliza y el panel entra por el lado del que vienes.
- Ventaja del primer turno **a nivel de serie**, además de la de juego a juego. Es la única
  lectura posible de las rondas apuntadas en modo rápido.

### Arreglado

- Borrar un torneo dejaba sus rondas huérfanas. `matches.tournament_id` es `ON DELETE SET NULL`,
  así que las partidas quedaban sin competición y sin torneo: invisibles en todas las pantallas
  pero vivas en las estadísticas de arquetipo. Ahora se borran antes que la cabecera.
- La lista del rival no se veía en una partida entre dos de la liga. No era un fallo de la
  pantalla —ya estaba programada— sino que esas partidas tienen `deck_b_id` a nulo porque nadie
  eligió el mazo del otro al registrarlas. Ahora se busca su mazo de ese arquetipo y se avisa de
  que es una suposición, en vez de dejar el hueco sin explicación.
- `CpBreakdownRow` no declaraba `value`, que existía en tiempo de ejecución. Sin él no se podía
  enseñar cuántos CP te estás dejando fuera por el límite.

### Base de datos

`npm run db:push` aplica las columnas y la tabla nuevas. Los CHECK no salen del esquema de
Drizzle y están en `drizzle/0001_v0_3_0.sql`, que es idempotente.

- `players`: `ladder_elo`, `ladder_elo_updated_at`, `ladder_note`.
- `matches`: `series_result` y `first_turn`, más un índice único parcial de
  (torneo, jugador, ronda).
- Tabla `ladder_entries`.

## [0.2.0] — 2026-09-08

La versión que se puede desplegar y abrir a los participantes: cada uno con su cuenta, la web
pensada para el móvil, y los torneos de fuera con su recuento de puntos para el Mundial.

### Añadido

**Cuentas e invitaciones**
- Cada jugador tiene cuenta propia con correo y contraseña. Las contraseñas se guardan con
  scrypt de `node:crypto`, sin dependencias nativas que compilar.
- Alta por enlace de invitación (`/registro/<token>`): tabla `invites` con etiqueta, papel con
  el que entra quien la use, número máximo de usos, caducidad y posibilidad de anularla.
- Tres papeles: propietario, organizador y jugador. El primero que se da de alta se queda como
  propietario.
- `npm run invite` genera desde la terminal el enlace de la primera cuenta.
- Interruptor de inscripciones abiertas o cerradas en Ajustes.

**Torneos de fuera y Championship Points**
- Tablas `tournaments` y `tournament_results`: tipo de evento, presencial u online, formato,
  Bo1/Bo3/Bo5, fechas, sede, ciudad, país, organizador, enlace, número de participantes, rondas,
  top cut, temporada, división y notas; y por jugador, puesto, récord, mazo, arquetipo, CP,
  premios, comentarios y si abandonó.
- Motor de Championship Points en `src/lib/cp.ts`: tablas por temporada, Best Finish Limit con
  cubos compartidos entre tipos equivalentes, y el "kicker" de asistencia. Trece pruebas
  automáticas (`npm test`).
- La app **no** promete un corte de CP para el Mundial: desde 2025 la invitación es por Top N
  del ranking de zona y ese corte solo se conoce al acabar la temporada.

**Partidas contra gente de fuera**
- `matches.player_b_id` pasa a ser opcional, con nombre y arquetipo del rival. Esas partidas no
  cuentan para el ranking ni para el Elo, pero sí para tus estadísticas de arquetipo y para la
  matriz de emparejamientos.

**Perfiles**
- Color, avatar (ninguno, un Pokémon o una imagen por URL https), biografía, arquetipo favorito
  y nombre de jugador de Play! Pokémon.

### Cambiado

- **Estilos migrados a Tailwind CSS v4**, configurado desde CSS: la paleta sigue siendo variables
  en `globals.css`, ahora expuestas con `@theme inline`. No hay `tailwind.config.js`.
- **Diseño mobile-first**: barra de navegación inferior con botón central para registrar partida,
  barra lateral en escritorio, objetivos táctiles de 44 px, tarjetas en vez de tablas en pantalla
  pequeña, y manifest para instalarla como aplicación.
- Las fechas se calculan en la zona horaria de la liga (`Europe/Madrid`) y no en UTC: una partida
  registrada a las 00:30 ya no se guardaba con la fecha del día anterior.

### Seguridad

- Los datos de jugador que llegan al navegador pasan por una proyección explícita que deja fuera
  el correo y el hash de la contraseña. Antes viajaban en el HTML de varias pantallas.
- Toda Server Action comprueba permisos por dentro: esconder un botón no protegía nada. Ahora un
  jugador solo edita sus mazos, sus partidas y sus resultados, y las competiciones, el calendario
  y los emparejamientos son cosa del organizador.
- El propietario no puede ser degradado ni desactivado por un organizador, y la liga no puede
  quedarse sin ninguno.
- La invitación se consume con una única sentencia condicional, así que un enlace de un solo uso
  ya no sirve para dos altas simultáneas.
- La sesión caduca también en el servidor, no solo en la cookie.
- Entrar con el correo equivocado tarda lo mismo que entrar con la contraseña equivocada.
- Las entradas de los formularios se validan antes de tocar la base: fechas ISO reales, enteros
  acotados y listas cerradas de valores. Un marcador imposible (3-0 en un Bo3) ya no se guarda.

### Corregido

- Un jugador desactivado quedaba atrapado en un bucle de redirecciones entre la portada y la
  pantalla de acceso, sin poder ni salir ni entrar con otra cuenta.
- Una serie empatada (un Bo3 que acaba 1-1 con el tercer juego en tablas por tiempo) no se podía
  guardar desde la interfaz.
- Borrar a un jugador se llevaba por delante en cascada sus mazos y sus resultados de torneo, y
  con ellos sus CP. Ahora, con historial, se desactiva.
- Un torneo sin temporada declarada sumaba a la vez en todas; ahora se deduce de la fecha (la
  temporada va de julio a junio).
- Dejar en blanco el número de participantes activaba tramos de CP que exigen un mínimo.
- Guardar dos veces seguidas el resultado de un torneo daba un error de servidor.
- El color de los porcentajes de victoria entre el 40% y el 60% no se aplicaba.

## [0.1.0] — 2026-09-07

Primera versión completa.

### Añadido

**Pantallas**
- Inicio con resumen de la liga, próximas fechas, clasificación, partidas pendientes, últimos
  resultados y uso del metagame.
- Ranking con ordenación por cualquier columna y gráfica de evolución del Elo.
- Resultados con filtros por competición, jugador, arquetipo y formato.
- Calendario mensual con eventos y partidas jugadas, más agenda y alta de eventos.
- Estadísticas: uso del metagame, rendimiento por arquetipo, matriz de emparejamientos, forma de
  las series, ventaja del primer turno y actividad por mes.
- Perfil por jugador: cifras propias, evolución del Elo, mazos, enfrentamientos directos,
  emparejamientos favorables e historial.
- Mazos con arquetipo (Pokémon principal y secundario) e importador de listas.
- Competiciones en cuatro formatos, con generación de emparejamientos por jornada.
- Ajustes de liga y gestión de jugadores.

**Motor**
- Clasificación con puntos configurables, %V, resistencia estilo Play! Pokémon (suelo del 25%),
  diferencia de juegos y racha.
- Elo global recalculado en orden cronológico sobre todo el historial.
- Matriz de emparejamientos arquetipo contra arquetipo, con intensidad de color según el número
  de partidas.
- Emparejamiento de rondas para liga, suizo y eliminatoria, evitando revanchas.
- Importador de listas de Pokémon TCG Live, Limitless y PTCGO, con validación de 60 cartas y
  máximo de 4 copias, y propuesta automática de arquetipo.
- Normalización de nombres de Pokémon al slug de Limitless.

**Infraestructura**
- Acceso por código de invitación con cookie firmada (HMAC-SHA256) y PIN opcional por jugador.
- Esquema de nueve tablas en PostgreSQL con Drizzle.
- Datos de ejemplo (`npm run db:seed`) y arranque en limpio (`--empty`).
- Sincronización de arquetipos desde la API de Limitless.
- Tema claro y oscuro por tokens CSS.
- Documentación completa en `docs/`.

### Notas

- La ordenación del ranking no incluye el enfrentamiento directo como desempate, que sí está en
  el reglamento oficial. Explicado y con el arreglo indicado en
  [docs/05-estadisticas.md](docs/05-estadisticas.md).
- El top cut del suizo se guarda en la competición pero el cuadro aún no se dibuja.
- Los campos `prizes_left` y `turns` de la tabla `games` existen en el esquema pero no tienen
  interfaz todavía.
