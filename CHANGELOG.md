# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## [0.77.0] — 2026-10-28

El recomendador, general o para ti. **Sin migración.** Lleva la v0.76.

### Añadido

- **General · Para ti** en Herramientas → Recomendador.
  - **General**: el jugador medio, como hasta ahora.
  - **Para ti**: con tus partidas. Por cada mazo (líder) que has jugado, cuánto has ganado
    frente a lo que el modelo esperaba con tus emparejamientos; ese «extra» (encogido con 15
    partidas imaginarias y con tope de ±10 puntos) se suma a su probabilidad. Tus partidas
    entran además como fuente de emparejamientos que cuenta doble. En cada mazo: «Lo tienes» y
    tu récord con él frente a lo esperado.
  - **Solo los mazos que tengo**: limita la recomendación a los líderes de tus mazos.
- `ajustesPersonales` en `lib/recomendador.ts` (2 pruebas).

## [0.76.0] — 2026-10-28

Mulligans en las rondas de torneo con diseño propio, pestañas nuevas, perfil ordenado, el
recomendador afinado por tipo de torneo y el fallo al traer City Leagues. **Sin migración.**

### Corregido

- **Traer Regionales y City Leagues reventaba (error 23503, `meta_entries_event_id_fkey`)**:
  dos City Leagues de la misma prefectura el mismo día se llamaban igual; el evento no se
  insertaba (choca con el índice nombre+fecha+división) pero se intentaba guardar sus puestos.
  Ahora el nombre lleva el número de Limitless y, si un evento no entra, sus puestos tampoco.
- **Las rondas de torneo no pedían los mulligans**: ahora sí, en cada juego.

### Cambiado

- **Mulligans con diseño propio** (`Mulligans`): misma familia que «Premios cogidos». Por
  jugador, su mano en abanico con SUS fundas; cada mulligan añade una carta y se baraja, y
  debajo «el rival puede robar +N». En Registrar partida y en las rondas de torneo.
- **Pestañas** (`.pestanas`): barra con icono por pestaña, la activa en relieve con filo de
  marca y deslizable en el móvil. En Herramientas y en las fuentes de Estadísticas.
- **Perfil**: «Sus mazos» con el cara a cara y los emparejamientos a su derecha (ya no queda
  media fila vacía). Torneos y últimas partidas enseñan 3 y el resto tras «Ver más».
- **Recomendador**:
  - Lo online pesa sobre todo en Challenges (suizo al mejor de 1), poco en Cups y casi nada en
    Regionales, tanto en el campo como en los emparejamientos (`PESOS_CRUCES`).
  - Más historia online: 45 días y hasta 40 torneos.
  - **TCG Live** (las victorias y derrotas apuntadas en cada mazo) cuenta solo para Challenges:
    es a ciegas y al mejor de 1. Encogido y con un tercio de peso.

## [0.75.0] — 2026-10-27

El recomendador aprende de vuestras partidas y recomienda la variante concreta. **Sin
migración.** Lleva de la v0.71 a la v0.74.

### Añadido

- **Acierto y calibración**: el modelo predice cada partida vuestra con los dos mazos conocidos
  (liga y torneos) usando SOLO datos de fuera, y la compara con lo que pasó. Enseña el % de
  acierto, el error (Brier; 0,25 es tirar una moneda) y, desde 30 partidas, aprende un
  parámetro α que corrige si se pasa de seguro (acerca sus % al 50) o se queda corto. Se
  recalcula solo con cada partida nueva. Al mejor de 3 se compara con la conversión de serie.
- **La mejor variante**: dentro de cada arquetipo (Pokémon líder), las variantes por compañero
  (Dragapult / Dusknoir, Dragapult / Pidgeot…) con su % de victorias online encogido hacia el
  50 %, sus listas y su conversión al corte. Se recomienda la mejor con datos suficientes y se
  pueden ver todas.
- `calibrar`, `evaluar`, `valorarVariantes`, `mejorVariante` en `lib/recomendador.ts`
  (3 pruebas más).

## [0.74.0] — 2026-10-27

El recomendador de mazos. **Sin migración.** Lleva la v0.71, v0.72 y v0.73.

### Añadido

- **Herramientas → Recomendador** (la primera pestaña): eliges tipo de torneo (Challenge, Cup,
  Regional o City League), jugadores y lo que buscas (top cut, ganar, Día 2 o récord positivo) y
  ordena los mazos por la probabilidad de conseguirlo, con cuota del campo, % por ronda,
  consistencia 1–10, mejor y peor emparejamiento, conversión real al corte y fiabilidad.
- **Un mazo = su Pokémon líder** (`liderDe`): «Dragapult ex», «Dragapult / Dusknoir» y el
  `dragapult-dusknoir` de Limitless son Dragapult; el resto, variantes. Así se cruzan todas las
  fuentes sin tablas de equivalencias.
- **El campo, por tipo de torneo**, mezclando fuentes con pesos propios (Regional: sobre todo
  Regionales importados; Cup: vuestros torneos + City Leagues + online; Challenge: sobre todo
  vuestros torneos). Una fuente con pocos datos pesa menos.
- **Emparejamientos** de la API de Limitless (online, 30 días) + vuestras rondas, encogidos
  hacia el 50 % cuando hay pocas partidas, y convertidos de partida al mejor de 1 a serie al
  mejor de 3 donde toca (p²(3 − 2p)). Las City Leagues se tratan como suizo al mejor de 1 + top 8.
- **Probabilidades del torneo** con la estructura oficial (Día 2, corte asimétrico) y la línea
  de corte de la calculadora suiza. Sin corte (Challenge), «top» es acabar entre los 8 primeros
  y «ganar», acabar 1.º.
- **Consistencia 1–10** (`notaConsistencia`): del % de mulligan de las listas y de los
  mulligans reales que apuntáis (mandan con 20 juegos o más).
- `lib/recomendador.ts` (puro, 8 pruebas) y `lib/recomendadorDatos.ts` (las fuentes).

## [0.73.0] — 2026-10-27

Móvil sin desbordes, Camino al Mundial, calendario online que cuadra, tutoriales que señalan,
más Balls y el easter egg de los engranajes arreglado. **Sin migración.** Lleva la v0.71 y la v0.72.

### Corregido

- **No se podía cambiar el ranking Elo · CP · Liga en el móvil**: la rejilla de Inicio no
  limitaba el ancho de sus columnas, el título más largo de «Próximos torneos» la ensanchaba y
  media portada (con el selector) quedaba fuera de la pantalla. `grid-cols-1` + `min-w-0`, y
  una regla general: un hijo de una rejilla ya no puede ensanchar su columna.
- **Klink, Klang y Klinklang no se veían**: no están en los sprites de la app (Limitless solo
  tiene los de Escarlata y Púrpura) y salían rotos encima del título. Ahora vienen de PokéAPI
  por número de Pokédex y aparecen en el centro de la pantalla, por encima de todo. El logro
  usa el mismo sprite.
- **El calendario no cuadraba con los torneos online**: el día se calculaba en UTC (un torneo a
  las 23:00 UTC salía el día anterior al de España) y solo había previsiones. Ahora día y hora
  van en hora de España, y si Limitless ya ha publicado la edición siguiente se usa esa (fecha,
  hora y enlace reales) y se quita la prevista de ese día. Pulsa «Torneos online previstos» en
  Ajustes → Importar datos para rehacerlos.

### Cambiado

- **Acompañante de la barra de abajo**: asoma a la derecha del icono y más pequeño (24 px), sin
  tapar la pantalla.
- **Balls de uso**: siete escalones y más separados — Poké (0), Super (40), Ultra (120), Ocaso
  (240), Lujo (400), Ente (650) y Master (1.000 puntos).
- **Tutoriales de página**: cada paso señala lo que explica (lo resalta, lo trae a la vista y
  oscurece el resto). Inicio tiene un tercer paso para el selector de ranking; Herramientas,
  su propio tutorial. Siguen saliendo solo la primera vez.

### Añadido

- **Camino al Mundial** en el perfil, debajo de los CP: con 650 CP de referencia, qué puestos te
  faltan en los huecos libres de Challenges, Cups y Regionales (o mejorando los que ya cuentan),
  de más fácil a más difícil, con lo que suma cada uno. `lib/planMundial.ts`, 5 pruebas.

## [0.72.0] — 2026-10-26

Móvil más claro, el último Regional compacto, emparejamientos por mazo y la rueda de Ajustes.
**Sin migración.** Lleva dentro la v0.71.

### Cambiado

- **Barra de abajo del móvil y «Más»**: los iconos de línea de la barra lateral de PC, en vez
  de los sprites (a 28 px se veían borrosos y desalineados).
- **Inicio · El último Regional**: las cuatro tarjetas van de 2 en 2 también en el móvil y son
  compactas (sprite a la izquierda, nombre y cifra a la derecha). «Top arquetipos», igual.
  Mucho menos scroll.
- **Estadísticas · Meta online**: nuevo bloque **«Emparejamientos por mazo»**: cada mazo se abre
  y enseña sus cruces de mejor a peor, con barra, % y récord. En el móvil la matriz solo
  dejaba ver cinco columnas. La matriz sigue debajo, más compacta en el móvil (filas solo con
  el sprite, celdas de 36 px).
- **Ajustes**: la rueda arriba a la izquierda, junto al título, con la versión debajo. Gira con
  cada toque.

### Añadido

- **Logro secreto nuevo, «Engranaje perfecto»**: machacar la rueda de Ajustes saca a Klink,
  Klang y Klinklang girando.

## [0.71.0] — 2026-10-26

Herramientas, la partida de liga desde «+», el desplegable del tercer mazo y logros más
secretos. **Sin migración nueva.**

### Añadido

- **Herramientas** (`/herramientas`, en Análisis), con cuatro pestañas:
  - **Calculadora suiza**: simula el torneo entero cientos de veces con emparejamiento suizo
    real (por puntos, empates, byes y, en los grandes, el corte del Día 2 y el top
    asimétrico hasta 16). Por cada total de puntos: récords, jugadores esperados y qué parte
    entra. Entrada segura, desde dónde hay opciones, cuántos pasan al Día 2 y «Tu torneo»
    (tu récord actual → tu probabilidad). Estructura oficial automática para Challenge, Cup y
    Regional. Mejora a `cut.ts`, que era una binomial.
  - **Consistencia**: probabilidad exacta de abrir con alguna carta de salida sabiendo que no
    hay mulligan, con y sin el robo del turno (básicos, salidas y cuántas son básicas).
  - **Premios**: una carta o dos distintas en premios, exacto (hipergeométrica).
  - **Manos y mulligan**: el simulador que estaba en cada mazo, con selector de mazo o lista
    pegada. La ficha del mazo enlaza aquí.
  - `lib/herramientas.ts`, puro: 10 pruebas. Ninguna cuenta devuelve NaN: entrada imposible
    → `null` y la pantalla dice qué falla.

### Corregido

- **Registrar desde «+» una partida de liga pendiente** la guardaba aparte, como amistoso, y
  la de la liga seguía pendiente. Ahora el formulario avisa y el servidor la anota en la
  partida de la liga (la de la jornada más baja si hay varias).
- **El desplegable del tercer mazo se cortaba** (el filo de color de las secciones, de la
  v0.63, iba con `overflow: hidden`). Ahora el filo es fondo de la tarjeta, y la lista se
  desplaza para quedar visible sobre el teclado y la barra.
- **Logros**: solo el Pokémon y el nombre; cómo se ganan ya no se ve.
- **Liga**: el subtítulo decía «Bo3» dos veces.
- **Inicio**: la nota de «Tú» ya no se corta.
- **«Falta el resultado» con un marcador válido**: no se ha podido reproducir (el formulario
  de producción manda bien el marcador). Ahora se registra en el log de Vercel qué campos
  llegaron cuando pasa, sin datos personales.

## [0.70.0] — 2026-10-22

App instalable de verdad y preparada para Android. **Sin migración nueva.**

### Añadido

- **Ajustes → Este dispositivo** reúne todo lo del dispositivo: animaciones, **instalar la
  app**, **la versión** (con «Buscar actualización») y el modo sin conexión. «Más» ya no lleva
  la versión.
- **Instalar**: botón «Instalar PokéArena» en Android y escritorio (se captura
  `beforeinstallprompt` en el layout raíz, que si no se perdía), los tres pasos de Safari en
  iPhone/iPad, aviso si en iPhone se usa otro navegador, y «ya estás en la app instalada».
- **Pantalla de bienvenida** al abrir la app instalada (solo en `display-mode: standalone`):
  icono y nombre sobre el azul de la app, se desvanece sola, sin JavaScript.
- **Manifiesto**: iconos PNG 192/512 normales y *maskable* (Chrome y Google Play los piden en
  PNG), `id`, fondo y tema en el azul del icono (la pantalla de inicio de Android sale de ahí) y
  atajos (Registrar partida, Torneos, Ranking) al mantener pulsado el icono.
- **`/.well-known/assetlinks.json`** para la app de Android (TWA), rellenado con
  `ANDROID_TWA_PACKAGE` y `ANDROID_TWA_SHA256` en Vercel. Sin ellas, lista vacía.
- **`docs/11-app-android.md`**: generar la app con Bubblewrap, APK para el grupo o Google Play en
  prueba interna, cómo unir la app con el dominio y qué pide Play.

## [0.69.0] — 2026-10-22

La versión en el móvil y el aviso de versión nueva. **Sin migración nueva.**

### Añadido

- **«Hay una versión nueva · Actualizar»**: al abrir la app o volver a ella, se pregunta a
  `/api/version` qué despliegue hay; si es otro, sale el aviso y «Actualizar» recarga. Es la
  causa de que el móvil pareciera ir versiones por detrás: una app instalada no se recarga al
  abrirla, se despierta con el código que tenía en memoria. Las páginas nunca estuvieron en
  caché (`public/sw.js` las pide siempre a la red).
- **La versión en «Más»** (el móvil no tiene barra lateral): número, si es producción o vista
  previa (con la rama) y «Buscar actualización».
- `GET /api/version`: sin sesión y sin datos, solo versión e id del despliegue, `no-store`.

## [0.68.0] — 2026-10-22

Destello en la barra, la Ball de cada uno en el ranking, el pie de la barra, el diagnóstico de
Discord y Ciphermaniac desbloqueado. **Sin migración nueva** (lleva las de la v0.65 y v0.67).

### Cambiado

- **Barra lateral**: al pasar el ratón por una sección, un barrido de luz cruza la fila, el
  icono se enciende en el color de marca y la fila brilla. Sin barrido con «reducir movimiento».
- **Pie de la barra**: sin el «@commit» a la vista (sigue en el título), iconos de idioma, tema
  y salir a 20 px con área de toque de 36 px, y fondo con un toque de marca.
- **Inicio**: la Ball de uso de cada uno, pequeña, junto a su nombre en el ranking (Elo, CP y
  Liga). Perfil e inicio calculan la Ball igual (`usoDeJugador`); antes el perfil contaba solo
  las partidas del ámbito elegido.
- **Ciphermaniac**: Reese ha metido nuestro User-Agent en su lista blanca. Se congela (ya no
  lleva la versión de la app, que lo cambiaba en cada despliegue).

### Corregido

- **Discord «no iba»**, cuatro causas posibles que antes no se distinguían:
  - El botón de prueba mandaba el aviso real: sin partidas pendientes o sin eventos esa semana
    no mandaba nada y decía «no enviado», aunque el webhook estuviera bien. Ahora cada canal
    tiene «Probar», que manda un mensaje de prueba siempre, y si falla dice **por qué**
    (variable ausente en el despliegue, URL que no es un webhook, 401/403, 404, 429…).
  - El filtro de la URL rechazaba en silencio las copiadas desde Discord PTB/Canary, las de
    `/api/v10/webhooks/…` y las pegadas con comillas, espacios o salto de línea. Ahora se
    normalizan (`lib/discordWebhook.ts`, 3 pruebas).
  - Sin `CRON_SECRET` el cron diario responde 401 y los avisos de los lunes no salen nunca:
    Ajustes → Discord ahora lo dice.
  - Los fallos van al log de Vercel con el canal y el código HTTP (nunca la URL).

## [0.67.0] — 2026-10-22

Recuperar la contraseña, sin correo. **Lleva migración:** `drizzle/0026_v0_67_0.sql` (la lanza
`npm run db:migrar`). **Obligatoria antes de subir.**

### Añadido

- **Enlace de recuperación**: en Ajustes → Jugadores, «Enlace para nueva contraseña» junto a
  cada persona. El organizador lo copia o lo comparte por WhatsApp; la persona abre
  `/recuperar/<token>`, pone contraseña nueva dos veces y entra directamente.
  - Vale **una vez** y **24 horas**; crear otro anula el pendiente de esa persona.
  - En la base se guarda el **hash SHA-256** del token, nunca el token; el enlace solo se ve
    una vez, en la pantalla de quien lo crea (ni en la URL ni en el aviso).
  - El enlace se consume con un UPDATE condicional (dos pestañas no lo usan dos veces), y una
    errata en la contraseña no lo gasta: se valida antes.
  - Mismas reglas que la gestión de jugadores: no para uno mismo, y al organizador principal
    solo lo toca otro organizador principal. Cuentas desactivadas, no.
  - En la pantalla de entrar: «¿Has olvidado la contraseña? Pídele a un organizador…».
- `lib/recuperacion.ts` (puro), 3 pruebas.

### Corregido

- **`session_version` no se comprobaba**: se guardaba en la cookie pero nadie la miraba, así
  que «cerrar las demás sesiones» no era posible. Ahora `currentPlayer()` y `requireActor()`
  la comparan con la de la cuenta. Las cookies de antes (versión 1 o sin versión) siguen
  valiendo: nadie se queda fuera al desplegar.
- **Cambiar la contraseña** (en Ajustes) ahora cierra las sesiones de los demás dispositivos y
  mantiene la tuya.

## [0.66.0] — 2026-10-22

Legibilidad, tras revisar la web desplegada. **Sin migración nueva** (lleva la de la v0.65).

### Cambiado

- **Contraste del gris tenue**: en la barra lateral clara, `--muted` estaba en 4,07:1 (por
  debajo del 4,5 de AA): «SEASON 1», «otoño» y los títulos de sección se leían mal. Ahora 5,5:1.
  El gris tenue general del tema claro sube de 4,6:1 a 5,3:1. El oscuro ya cumplía.
- **Letra mínima**: lo que iba a 9 y 10 px sube a 10 y 11 px en toda la app (una regla en
  `globals.css`, sin tocar cada pantalla).
- **Barra lateral en pantallas bajas** (≤ 820 px de alto): filas de 36 px en vez de 44 y
  menos aire entre secciones, para que «Top Decks» y lo de abajo quepan sin scroll. Las
  pantallas altas no cambian.
- **Lista de Ligas**: las partidas jugadas tienen su columna (PJ) en vez de ir apiladas bajo
  el %V, que se apretaba.
- Los pétalos y hojas de la estación se quedan como están, a petición.

## [0.65.0] — 2026-10-22

La barra de la v0.62 con una Poké Ball para plegarla, el ranking del inicio a elegir,
logros secretos, la Ball de uso y las etiquetas del perfil.
**Lleva migración:** `drizzle/0025_v0_65_0.sql` (la lanza `npm run db:migrar`). **Obligatoria
antes de subir**: la app lee la columna nueva `players.logros`.

### Cambiado

- **La barra lateral vuelve a la de la v0.62** (iconos de línea). Los sprites se quedan en la
  barra de abajo del móvil y en «Más».
- **Plegar la barra: una Poké Ball en el borde**, a la altura de «Análisis», medio dentro y
  medio fuera. Fuera el botón de arriba y su franja muerta. Rueda al plegar. La posición se
  mide (cambia con el tamaño de la ventana y el scroll de la barra).
- **La clasificación de cada liga vuelve a la de la v0.62** (con la columna «Arq.»), a petición.
- **Inicio: el ranking se elige** — Elo (por defecto), CP o Liga, por URL (`?rk=cp`).
- **Mulligans: una Poké Ball** que se zarandea como en una captura en vez del dado, con el
  número en una chapa.
- La tarjeta de la liga del inicio y del perfil ya no corta el nombre («LIGA REGULAR IN…»).

### Añadido

- **Logros secretos** (`lib/logros.ts`, `players.logros`): se ganan encontrando los easter eggs
  — Solrock y Lunatone (cambiar el tema), Tadbulb (machacarlo), Psyduck (penalización de dos
  premios), el Pokémon de la estación y uno nuevo: **machacar la Poké Ball de la barra saca un
  Voltorb**. En el perfil solo se ven los encontrados; del resto, solo cuántos quedan. Aviso de
  «logro desbloqueado» la primera vez. La acción solo admite claves conocidas y solo toca la
  cuenta de quien llama.
- **La Ball de uso** en el perfil: Poké → Super → Ultra → Master según partidas (1 punto),
  torneos (3) y logros (5), con barra de progreso.
- **Etiquetas** junto a la de Bronce del ladder: Entrenador / veterano / As de la liga
  (partidas), Primer torneo / Torneísta / Viajero del circuito (torneos) y las de secretos.
- 3 pruebas nuevas (`tests/logros.test.ts`).

### Verificado

- Codificación, acciones e i18n estricto en verde. `npm test`: **583 de 583**. `tsc`: ningún
  error nuevo de los nuestros. `npm run build`: pendiente.

## [0.64.0] — 2026-10-22

Fuera los emojis: sprites de objetos y Pokémon, como el resto de imágenes de la app.
**Sin migración.** Lleva dentro la v0.63.

### Cambiado

- **El menú, con sprites en vez de emojis**: Chansey en Inicio (la ayudante del Centro
  Pokémon), Mapa en Calendario, Buscarrivales en Torneos, Amuleto Iris en Liga, Caramelo Raro
  en Resultados, Master Ball en Ranking, Pokéradar en Estadísticas, Super Ball en Top Decks,
  Poké Ball en Mazos, Zahorí en Ajustes y Repartir Experiencia en Perfil. Objetos de PokéAPI
  y Pokémon de Limitless, enlazados como siempre. Si un sprite no carga, sale el icono de línea
  de antes, nunca una imagen rota (`NavIcono`). Barra lateral, barra de abajo y «Más».
- **Edificios y estructuras (Centro Pokémon, gimnasios): no.** No hay sprites publicados de
  ellos, y dibujarlos sería copiar un diseño de Pokémon. Por eso Chansey y no el edificio.
- **La cinta de las rondas de torneo** lleva la Ball de su familia (Poké, Super, Ultra,
  Premier) en vez de un emoji. Los premios de la lista de torneos, la Moneda Amuleto.
- Fuera los emojis de los grupos de Ajustes y de Registrar partida (🪙, 🎲, ⚔, 🤝).
- `lib/objetos.ts`: `leerRef` (`objeto:<slug>` / `pokemon:<nombre>`) y `BALL_DE_FAMILIA`,
  2 pruebas más.

### Verificado

- Codificación, acciones e i18n estricto en verde. `npm test`: **580 de 580**. `tsc`: ningún
  error nuevo de los nuestros. `npm run build`: pendiente.

## [0.63.0] — 2026-10-22

Ajustes ordenado, la Liga más sobria, el filtro múltiple del calendario, el panel de
enfrentamiento en las rondas y Registrar partida con temática de Pokémon. **Sin migración.**

### Cambiado

- **Ajustes, por lo que se viene a hacer.** «La liga» tenía torneos, importación de datos y
  el modo sin conexión mezclados. Ahora:
  - **Lo tuyo**: «Este dispositivo» (animaciones y modo sin conexión, este último ahora para
    todos: es la salida de emergencia de cualquiera) y Cuenta.
  - **Organizar**: Jugadores · Invitaciones · **La liga** (nombre, temporada, Elo, altas,
    reiniciar Elo, nueva temporada) · **Torneos y CP** (temporada de CP, zona, torneos
    abandonados) · **Importar datos** (torneos online de Limitless, torneos previstos,
    Regionales y City Leagues, eventos importados, diagnóstico de Ciphermaniac) ·
    **Arquetipos** (catálogo y familias) · Discord · Zona de riesgo.
  - Cada grupo con su emoji. El «Resumen rápido» pasa a una línea.
  - **Fuera los puntos por victoria/empate/derrota**: se juega a los oficiales (3/1/0). Los
    valores guardados se respetan.
  - `saveSettings` ahora **solo actualiza los campos que llegan**: con dos formularios (La
    liga · Torneos y CP), guardar uno ya no pisa el otro.
- **La Liga, más sobria.** La clasificación es una tabla limpia: fuera los degradados de
  fila, las medallas grandes y la columna «Arq.»; el podio solo se marca en el número. En el
  móvil se ven por fin el récord y el %V (antes solo puesto y nombre). La modalidad va en el
  subtítulo en vez de en una tarjeta suelta.
- **Torneos**: fuera «Tus huecos de Best Finish Limit» (está entero en el perfil). **«Tus CP»
  lleva a tu perfil**, al bloque de Championship Points (`#cp`). **El filtro ya no se corta**:
  los chips saltan de línea y en el móvil las fechas van debajo de la persona.
- **Calendario: varios tipos a la vez** (`?tipo=regional,league_cup`). Cada chip pone o
  quita su tipo; un enlace viejo de un solo tipo se sigue leyendo. `lib/calendar.ts`
  (`parseTipos`, `alternarTipo`, `pasaTipos`), 4 pruebas.
- **Menú con emojis de Pokémon**: 🏥 Inicio (el Centro Pokémon), 🗺️ Calendario, 🏆 Torneos,
  🏅 Liga, 📜 Resultados, 🥇 Ranking, 📊 Estadísticas, 🃏 Top Decks, ⚙️ Ajustes, 🧢 Perfil.
  Barra lateral, barra de abajo y «Más». La activa va entera; las demás, un poco apagadas.
- **Registrar partida, con color y objetos**: Buscarrivales en «¿Contra quién?», Caramelo
  Raro en Resultado, Mapa en Contexto, Poké Ball en Guardar y Moneda Amuleto en Premios
  (sprites de PokéAPI enlazados, como las Balls: `lib/objetos.ts`, 2 pruebas). Filo de color
  en cada sección, la cabecera de cada juego cambia de color según quién lo gana, 🪙 en quién
  empezó y 🎲 en los mulligans.
- **Las fundas de los premios**: cada jugador con las suyas, del color de su perfil, con
  brillo de plástico y una estrella (diseño propio, no el dorso oficial). Cogida, la carta se
  ve boca arriba y dorada.

### Añadido

- **El panel de enfrentamiento en las rondas de torneo**, como en Registrar partida: tu avatar
  contra el del rival (o su inicial si no es del grupo), «VS» o el marcador juego a juego, el
  ganador iluminado y el borde con el color del tipo de torneo. Las rondas reciben los
  jugadores públicos (`PublicPlayer`, nunca `currentPlayer()`).

### Corregido

- **Diagnóstico de Ciphermaniac (0/2, 403)**: no era un fallo de la app. Su documentación
  sigue usando `reports/tournaments.json` y dice que un fichero que falta da 404; el 403 es su
  servidor (Cloudflare) rechazando lecturas automáticas. El diagnóstico ahora lo explica, dice
  qué significa cada código, prueba también `build/v1/channels/production.json` y enlaza su
  formulario para pedir acceso. No se intenta esquivar el bloqueo. `lib/estadoFuente.ts`,
  2 pruebas.

### Verificado

- Codificación, acciones e i18n estricto en verde. `npm test`: **578 de 578**. `tsc` (con
  tipos de librería simulados): ningún error nuevo de los nuestros. `npm run build`: pendiente.

## [0.62.0] — 2026-10-21

Barra lateral, el panel según el tipo de partida, y mulligans y premios con animación.
**Sin migración.**

### Cambiado

- **Barra lateral**: más estrecha (13,5 rem, antes 15) y **sigue el tema**: era oscura siempre,
  también en tema claro, y el contraste con el contenido era muy fuerte; en claro ahora es clara y
  suave. Los **títulos de sección** (Principal, Competir…) se distinguen: más grandes, en negrita,
  con el gris fuerte y una raya que separa el bloque.
- **Registrar partida, según el tipo**: el panel de enfrentamiento lleva una cinta con lo que es
  («⚔ Liga» / «🤝 Amistoso») y su estilo (liga: borde y brillo dorados; amistoso: borde
  discontinuo y verde). Las **rondas de torneo** llevan una cinta por familia, con su color:
  Challenge, Cup, Regional y los grandes (dorado y rojo), online y el resto, más la ronda y el Bo.
  `lib/familiaTorneo.ts` (puro, con prueba).
- **Mulligans: un dado de veinte caras** (`ContadorDado`), con «−» y «+»; cada cambio lo tira.
- **Premios: las seis cartas de premio** boca abajo; tocar la tercera voltea las tres primeras en
  cadena. Tocar la misma la deja sin apuntar, y «0» es «ninguna», como antes.
- **Huevo de pascua**: al marcar una penalización de 2 premios asoma un Psyduck que tiembla.
- Todo respeta «reducir movimiento».

### Verificado

- `npm run verificar`: **570 de 570**, `tsc` sin errores. `npm run build`: pendiente.

## [0.61.0] — 2026-10-21

Los arreglos de la revisión en la app desplegada, y un tutorial por página.
**Lleva migración:** `drizzle/0024_v0_61_0.sql` (la lanza `npm run db:migrar`).

### Corregido (de la revisión de la v0.60 desplegada)

- **El Ranking por defecto no tenía las mejoras de la v0.60**: la vista «Todo», que es la que se
  abre, usa `RankingTodoTable`, y las mejoras se habían puesto en la de liga. Ahora también ahí:
  la columna Forma, el % atenuado y con asterisco con menos de 5 partidas, el líder y el mejor
  Elo arriba, y la leyenda. `Forma` y `LeyendaRanking` se comparten entre las dos tablas.
- **El récord V–D–E se partía en dos líneas** («56–» / «44–5»): ahora en una.
- **En el móvil no se veía el número del %**, solo la barra: ahora sale la cifra.
- **El Sustituto salía diminuto** (el dibujo de Showdown trae mucho margen): ampliado.
- **«Faltan juegos: nadie llega a 2»** salía en el modo rápido, donde confundía: solo en el detallado.
- **`/perfil` daba 404**: ahora lleva a tu perfil.
- **Barras del meta online en tema claro**: más contraste.

### Añadido

- **Tutorial de cada página**: la primera vez que entras en una de las 14 principales, una
  tarjeta con para qué sirve y cómo se usa (dos pasos). Una vez por CUENTA
  (`players.tutoriales_vistos`), no por navegador, y no se apila con el general: si te toca el
  general, el de la página espera. `lib/tutorialesPagina.ts` (puro, 3 pruebas).

### Verificado

- `npm run verificar`: **569 de 569**, `tsc` sin errores. `npm run build`: pendiente.

## [0.60.0] — 2026-10-21

Estadísticas por juegos, Ranking claro y tutorial de primera vez.
**Lleva migración:** `drizzle/0023_v0_60_0.sql` (la lanza `npm run db:migrar`).

### Cambiado

- **Las estadísticas por mazo cuentan POR JUEGOS** (decisión de Ibai): cada juego suma al mazo
  con el que se jugó —el suyo si lo tiene, el de la serie si no—. Antes, la serie entera iba al
  mazo de la serie: un 1-2 con Dragapult en el juego 1 y Dhelmise en el 3 se apuntaba entero a
  uno. Uso y % de victorias por mazo pasan a ser de juegos; una partida sin juegos (empate por
  tiempo en modo rápido) cuenta como una unidad. La matriz ya contaba por juegos desde la v0.25.
  Estadísticas lo dice bajo «Vuestro metagame». 4 pruebas, con el caso real.
- **Ranking, ordenado y claro**:
  - Arriba, **el líder y su ventaja** y **el mejor Elo**, además de partidas y torneos.
  - **Columna «Forma»**: los últimos 5 resultados en colores, del más antiguo al más reciente
    (`formaReciente()`, con prueba). También en el móvil.
  - **El % con menos de 5 partidas, atenuado y con asterisco**: es orientativo.
  - **Cada columna se explica** al pasar el ratón, y una **leyenda** bajo la tabla enlaza a
    Reglas y al Glosario.
  - **Orden**: lo de la liga junto (tabla, Elo, enfrentamientos directos) y lo del circuito
    oficial detrás (Camino al Mundial, Ladder).

### Añadido

- **Tutorial de primera vez**: siete pasos, y en cada uno se resalta en pantalla la parte de la
  que habla (la barra de abajo en el móvil, la lateral en el PC). Sale **una vez por cuenta**
  (`players.tutorial_visto_at`), no por navegador: no se repite al entrar desde otro dispositivo,
  y les sale también a los que ya estaban. Ese dato no viaja al navegador con el resto del
  jugador (fuera de `PublicPlayer`, como el correo).

### Verificado

- `npm run verificar`: **566 de 566**, `tsc` sin errores. `npm run build`: pendiente.

## [0.59.0] — 2026-10-21

Discord, comentarios en los mazos y Estadísticas ordenada.
**Lleva migración:** `drizzle/0022_v0_59_0.sql` (la lanza `npm run db:migrar`).

### Añadido

- **Avisos a Discord por webhooks** (`lib/discord.ts`, `lib/discordMensajes.ts`), tres, cada uno
  a su canal y cada uno opcional (sin su variable, no se manda):
  - `DISCORD_WEBHOOK_RESULTADOS` — los resultados de un torneo **al cerrarse**, a mano o por el
    cron: el grupo por puesto, medalla en el corte, mazo y récord, y enlace a la ficha. Solo los
    jugadores del grupo, nunca terceros.
  - `DISCORD_WEBHOOK_LIGA` — **los lunes**, las partidas de liga sin resultado, por liga y jornada.
  - `DISCORD_WEBHOOK_AGENDA` — **los lunes**, la agenda de la semana (calendario + torneos).
  - Un aviso **nunca rompe nada**: si Discord no responde, el torneo se cierra igual y el cron
    sigue. La URL del webhook es un secreto: no sale en pantalla ni en logs.
  - **Ajustes → Discord**: qué avisos están puestos (sí/no) y botones para mandar una prueba.
  - Sin cron nuevo: va en el de la limpieza, que ya corre cada noche (el plan Hobby los limita).
  - 5 pruebas: orden, medallas, agrupación, semana de lunes a domingo, «lunes en Madrid».
- **Comentarios en las listas de los mazos** (`decks.notes`): en el formulario del mazo, y en su
  ficha encima de la lista.

### Cambiado

- **Estadísticas: los números grandes arriba** («En números»), y después los gráficos en orden:
  meta, vuestro metagame, torneos, jugadores, partidas y actividad.
- **El meta online recibe los filtros que le aplican**: el formato y las fechas («desde» marca la
  ventana, entre 7 y 90 días). Debajo dice cuáles le llegan y cuáles no (jugador, torneo).

### Verificado

- `npm run verificar`: **561 de 561**, `tsc` sin errores. `npm run build`: pendiente.

## [0.58.0] — 2026-10-21

Registrar partida más visual, líderes por pestaña, el fallo del Bo3 de liga y arreglos de tu
lista. **Sin migración.**

### Corregido

- **El fallo del Bo3 de liga**: la ficha de la partida pintaba el mazo de la SERIE en todos los
  juegos. Con «mazo distinto en cada juego», cada juego guarda el suyo, y la ficha enseñaba el
  mismo en los tres (el formulario de editar sí los enseñaba bien: por eso no cuadraban). El dato
  guardado estaba bien; ahora la ficha también.
- **«Other» con imagen rota** en el meta online: ahora sale el Sustituto.

### Cambiado

- **Registrar partida, en pantalla de enfrentamiento**: cada jugador en su lado con su color de
  perfil (el fondo se parte en diagonal), el avatar con un aro que brilla, el marcador grande en
  el centro con «VS · Bo3», y el ganador iluminado. Botones del modo rápido con «Victoria» o
  «Derrota», brillo al elegirlos, y el botón de guardar con un destello. Se lee en tema claro y
  oscuro, y respeta «reducir movimiento».
- **«Other» = el Sustituto** (de Pokémon Showdown: Limitless no lo tiene). Si no cargara, vuelve
  el marcador de cartas apiladas, nunca una imagen rota. En los seis sitios donde sale.
- **El Pokémon de temporada sale hacia abajo** cuando está arriba del todo (la cabecera del
  móvil): subiendo se iba fuera de la pantalla.
- **Ajustes**: fuera los atajos (con el menú a la izquierda no aportaban); el menú, más ancho y
  partiendo línea, ya no se come el contenido.
- **Plegar la barra**: un icono pequeño y tenue en la esquina, en vez del botón ancho.
- **Estadísticas**: fuera «Comparar». Y las dos matrices dicen cuál es cuál: «Emparejamientos de
  vuestra liga» y «Emparejamientos del meta online (Limitless, todo el mundo)».

### Añadido

- **Líderes por pestaña**: dos Pokémon por sección, como los líderes de gimnasio. En pantallas
  muy anchas, en los márgenes vacíos, flotando sobre una peana; en el móvil, el de la pestaña
  asoma sobre la pestaña activa de la barra de abajo. `lib/lideres.ts` (puro, 3 pruebas).

### Verificado

- `npm run verificar`: **556 de 556**, `tsc` sin errores. `npm run build`: pendiente.

## [0.57.0] — 2026-10-20

Torneos: formato por fase y resultado rápido en la vista de rondas.
**Lleva migración:** `drizzle/0021_v0_57_0.sql` (la lanza `npm run db:migrar`).

### Añadido

- **Formato del top cut, aparte del suizo** (`tournaments.best_of_top`): en el formulario del
  torneo, «Formato del top cut»: Igual · Bo1 · Bo3 · Bo5. Lo típico en online: suizo a Bo1 y
  corte a Bo3. «Igual» (nulo) es lo de siempre.
  - `faseDeRonda()` y `bestOfDeRonda()` en `lib/estructura.ts` (puras, 4 pruebas). La frontera
    es la de siempre: `formaDe(t).suizo` (el oficial por asistencia o el tecleado); una ronda
    mayor es del corte. Un Regional de 3.342: 14 de suizo, y la 15 ya es corte.
  - El formulario de la ronda y el servidor usan el formato de SU fase. El servidor no se fía
    del formulario: lo recalcula.
- **Resultado rápido en las rondas abiertas** (las apuntadas antes de jugar): los marcadores del
  formato de esa ronda en la propia fila, un toque y guardado. Misma acción y permisos que en la
  liga, y **pone al día el récord guardado** del jugador en el torneo, como el formulario normal.

### Verificado

- `npm run verificar`: **553 de 553**, `tsc` sin errores. `npm run build`: pendiente.

## [0.56.0] — 2026-10-20

Pulido: barra lateral plegable, contenido más ancho, gráfica del Elo, contraste, glosario y
bienvenida. **Sin migración nueva.**

### Añadido

- **Barra lateral plegable a solo iconos** (botón arriba de la barra). La preferencia va en una
  cookie que lee el servidor: la página llega ya como la dejaste, sin parpadeo. Plegada, cada
  icono enseña su nombre al pasar el ratón.
- **Contenido más ancho en pantallas grandes**: hasta `6xl` y `7xl` (antes, `5xl` siempre).
- **Bienvenida en tres pasos** para quien se dio de alta hace menos de 30 días: perfil, mazo
  habitual y cómo se apunta una partida (con el modo rápido en pequeño). Una sola vez.
- **Glosario** (`/glosario`): CP, Best Finish Limit, Elo, resistencia, top cut, espejo y bye.
  `<Termino>`: subrayado de puntos, definición al pasar el ratón y, con un toque, su entrada.
  Enlazado desde Reglas, Ajustes y el meta online.

### Cambiado

- **Gráfica del Elo**: selector de periodo (último mes · 3 meses · todo; por defecto 3 meses,
  contado desde el último dato para que no se quede vacía si la liga para). Y en la vista por
  partida, **la línea se corta** cuando alguien pasa más de 14 días sin jugar, en vez de unir los
  puntos con una raya larga que parecía una evolución. En la de Ladder no: ahí un hueco es que
  el rango se mantuvo.
- **Contraste en «Enfrentamientos directos»**: el tinte de cada casilla tiene tope (40 %) y un
  borde del mismo color; el número y el récord van siempre en el color de máximo contraste,
  sin transparencias. Antes, sobre los tintes fuertes, el récord casi no se leía.

### Verificado

- `npm run verificar`: **549 de 549**, `tsc` sin errores. `npm run build`: pendiente.

## [0.55.0] — 2026-10-20

Estructura: Ajustes ordenado, Reglas y puntuación, y plantillas de torneo. **Sin migración nueva.**

### Cambiado — Ajustes

- **Menú de secciones** a la izquierda en el PC y como tira de chips en el móvil, con los paneles
  a la derecha. Al tocar una sección, se abre sola (`AbrirAncla`).
- **Lo de cada uno primero** («Lo tuyo»: Apariencia, Tu cuenta, Reglas) y **lo de organizar
  después** («Organizar la liga»): un jugador ya no ve un muro de herramientas que no son suyas.
- Todos los grupos del mismo ancho: antes cada desplegable medía lo que su título.

### Añadido

- **Reglas y puntuación** (`/reglas`): lo que era «Cómo se calcula todo» al final de Ajustes, en su
  página, con la puntuación ACTUAL de la liga arriba. Enlazada desde el Ranking y desde Ajustes.
- **Plantillas de torneo**: al crear uno, «Copiar la estructura de» los cuatro últimos. Se copian
  tipo, formato, rondas, fases, corte, umbrales, sede y organizador. **No** se copian el estado (se
  crearía cerrado), la asistencia (los CP saldrían con la gente del otro), el enlace ni las notas;
  la fecha es la de hoy. Una plantilla nunca edita el torneo original: solo rellena valores.

### Verificado

- `npm run verificar`: **549 de 549**, `tsc` sin errores. `npm run build`: pendiente.

## [0.54.0] — 2026-10-20

Resultados a un toque desde las listas, tus pendientes primero y rastro de correcciones.
**Lleva migración:** `drizzle/0020_v0_54_0.sql` (la lanza `npm run db:migrar`).

### Añadido

- **Resultado rápido desde la lista de pendientes de la liga**: «Resultado» despliega los
  marcadores del formato de esa partida (y el empate por tiempo); un toque y guardado, sin abrir
  el formulario. Son formularios normales: funcionan sin JavaScript. El formulario completo sigue
  a un toque, «Más detalle». Misma regla de permisos que el guardado normal.
- **Tus partidas pendientes, lo primero de Inicio**, con el mismo resultado rápido.
- **Notificaciones, las justas**: un número en el menú con tus partidas sin resultado (sobre
  «Liga» en la barra lateral y sobre «Inicio» en el móvil). Nada de avisos al teléfono.
- **Rastro de correcciones**: columnas `matches.updated_by` y `updated_at`. Corregir un resultado
  deja quién y cuándo, y la ficha de la partida lo enseña.
- `src/lib/marcador.ts` (puro): marcadores por formato y reparto de juegos, 3 pruebas.

### Cambiado

- **Un solo nombre de temporada en pantalla, «Temporada 1»**, en Inicio, Ranking y Torneos. Por
  dentro, los CP siguen contándose por la temporada oficial de Play! Pokémon (2027), que es la de
  sus tablas. La frase para confirmar el borrado de una temporada sigue llevando el año: es lo
  que identifica qué se borra.

### Verificado

- `npm run verificar`: **549 de 549**, `tsc` sin errores. `npm run build`: pendiente.

## [0.53.0] — 2026-10-20

Registrar resultado en el móvil, con un toque. **Sin migración.**

### Cambiado — registrar partida

- **Modo rápido por defecto**: el resultado se mete con un toque —2-0, 2-1, 1-2, 0-2 en Bo3; 1-0,
  0-1 en Bo1; y los de Bo5—, en verde si gana el de la izquierda y en rojo si pierde. El juego a
  juego (quién empezó, mulligans, premios y penalización) queda detrás de **«Detallar juegos»**.
  Al editar una partida que ya tiene detalle apuntado, se abre en detalle para no esconderlo.
- **Empate por tiempo**, como estado de la PARTIDA (`seriesResult = "tie"`), no «1-1 y un juego
  empatado»: no se inventan juegos que no se jugaron. En los dos modos.
- **El resultado dicho antes de guardar** («Gana Ibai», «Empate por tiempo»).
- **El botón de guardar, en una barra opaca** que dice qué falta. Antes, desactivado, era
  translúcido y el Juego 2 se veía a través, como si la pantalla estuviera rota.

### Corregido

- **Una partida sin juegos no se guardaba y no avisaba**: la acción salía sin decir nada. Ahora,
  sin juegos solo vale el empate por tiempo, y si falta el resultado lo dice.

### Añadido

- **Camino al Mundial: cuándo se actualizó cada puesto**, bajo el nombre, y el dato más reciente
  en la cabecera. El dato ya se guardaba (`rankZoneUpdatedAt`); no se enseñaba.

### Ajustes

- El atajo «Sin conexión» no se entendía: ahora dice «Si la app no se actualiza», que es para lo
  que sirve (la salida de emergencia del modo sin conexión de la v0.35).
- Invitaciones: el texto «cualquiera con el enlace puede darse de alta» asustaba y no era verdad.
  Cada enlace es de un uso por defecto, caduca a los 14 días y se puede anular; ahora lo dice.

### Verificado

- `npm run verificar`: **546 de 546**, `tsc` sin errores. `npm run build`: pendiente.

## [0.52.0] — 2026-10-19

Meta online con partidas reales, Estadísticas reordenada y Ciphermaniac. **Sin migración.**

### Añadido

- **Meta online: cómo rinde cada mazo** (primer bloque de Estadísticas). Cruza dos endpoints
  oficiales de Limitless, `/standings` (el mazo de cada jugador) y `/pairings` (quién jugó contra
  quién y quién ganó): es el uso que su propia documentación pone de ejemplo. Antes el % de un
  arquetipo salía del récord final de cada jugador; ahora sale de cada partida.
  - **% de victorias por arquetipo**, en barras con la línea del 50 %.
  - **Matriz de emparejamientos** fila contra columna: verde gana, rojo pierde, con las partidas.
    Por debajo de 5 partidas no da %; por debajo de 30, el arquetipo no entra.
  - **Fuera del cálculo, y se dice cuántos**: byes, dobles derrotas, partidas con un mazo
    desconocido y **espejos**, que siempre dan 50 % y no dicen nada del mazo.
  - Componente de servidor, sin Recharts, dentro de un `<Suspense>`: la página no espera.
  - `src/lib/emparejamientosOnline.ts` (puro), 7 pruebas, una de privacidad.
- **Ciphermaniac**: cliente (`src/lib/sources/ciphermaniac.ts`) según su documentación —se
  identifica, cachea 6 h, entra por `reports/tournaments.json`, no adivina rutas— y **página de
  diagnóstico** en Ajustes. Su documentación no da los nombres de los campos, así que el lector es
  defensivo y el diagnóstico enseña qué responde de verdad cada fichero. No pide los que traen
  nombres de jugadores (`decks.json`, `players.json`).

### Cambiado

- **Estadísticas, en cinco bloques con título y en orden**: Meta · Vuestro metagame (cifras,
  arquetipos, rendimiento, matriz) · Torneos · Jugadores · Partidas y actividad. Antes la matriz
  iba a mitad, y «cómo acaban las series» al final, separada de la actividad, que iba arriba.

### Verificado

- `npm run verificar`: **546 de 546**, `tsc` sin errores. `npm run build`: pendiente.

## [0.51.0] — 2026-10-19

Listas de Top Decks con sus cartas, top cut enlazado a Limitless y los ejes de Elo y Ladder.
**Sin migración ni dependencias nuevas.**

### Añadido

- **Top Decks → tocar un arquetipo**: sus mejores listas en los torneos online, con las cartas
  (imagen y texto), el puesto, el récord, el torneo y su tamaño. Página `/topdecks/[mazo]`,
  conservando los días y el formato que se miraban.
  - **Sale de la API oficial de Limitless** (`/tournaments/{id}/standings`), comprobado en su
    documentación: el campo `decklist` existe. Su formato está marcado como «específico de cada
    juego» y **no está documentado para Pokémon**, así que no se supone: `normalizarLista` lee la
    forma esperada y, si llega otra, la pantalla dice «lista no disponible» sin romperse.
  - **Sin nombres de jugador**: la API los trae y no se leen. Hay una prueba que lo verifica.
  - Imágenes del CDN de cartas de Limitless, que es un patrón de terceros sin contrato: si una no
    carga, se queda la línea de texto.
  - `src/lib/listasLimitless.ts` (puro), con 7 pruebas.
- **El top cut de «El último Regional» enlaza a Limitless**: toda la fila lleva a la página del
  torneo, donde está la lista de cada puesto. A la página del torneo y no a la del jugador: para
  eso habría que guardar su nombre. Solo si la fuente es de verdad Limitless.

### Corregido

- **El eje del Elo repetía fechas** («26 sept, 26 sept»): el eje es el número de partida y varias
  partidas comparten día. Ahora se marca la primera partida de cada día, como mucho cinco.
- **El Ladder se dibujaba como una curva suavizada**, que convertía un reinicio de rango en una
  caída gradual de una semana. Ahora va en escalones: un rango se mantiene hasta que se cambia.

### Verificado

- `npm run verificar`: codificación, «use server», i18n estricto, **539 de 539** y `tsc`.
- `npm run build`: pendiente.

## [0.50.0] — 2026-10-19

Seguimiento de jugadores, tipos de partida con color, el logo en la pestaña y la versión de
verdad. **Sin migración ni dependencias nuevas.**

### Añadido

- **Seguimiento de jugadores** (Estadísticas): una línea por jugador con partidas jugadas o %
  de victorias, por día, semana o mes. Filtros de jugadores (con el color de su perfil; por
  defecto los cinco más activos), tipos de partida y arquetipo. Al tocar un punto: partidas,
  récord, % y con qué arquetipos jugó cada uno en ese periodo. Debajo, una tabla con el total de
  cada uno, que en el móvil se lee mejor que la gráfica.
  - **Eje de tiempo real y continuo**: los periodos sin partidas existen. Con «% victorias», un
    periodo sin partidas es un hueco, no un 0 %: no jugar no es perder.
  - `src/lib/seguimiento.ts` (puro), con 8 pruebas.
- **Cuatro tipos de partida con su color** en todas las gráficas que los usen: liga azul,
  presencial marrón, online verde y amistosos gris (`src/lib/tiposPartida.ts`, 3 pruebas).
- **El logo en la pestaña del navegador y en el iPhone.** Ya existía (`public/icon.svg`) pero no
  estaba declarado. Más un PNG de 180 px para «Añadir a pantalla de inicio», porque iOS ignora
  los SVG ahí, y uno de 32 px para los navegadores que no aceptan SVG.

### Corregido

- **La versión que enseñaba la app no era fiable.** Salía de `npm_package_version`, que solo
  existe mientras corre npm: en el servidor de Vercel podía faltar, y entonces enseñaba un
  «0.27.0» escrito a mano. Ahora se fija en el build, y la etiqueta lleva el **commit**; en las
  vistas previas, también la **rama**, en ámbar. Al tocarla, todo: versión, entorno, rama y commit.
- **Distribución horaria**: barras apiladas por tipo en vez de una curva suavizada que se
  inventaba valores entre horas, y **los amistosos ya no cuentan como torneos**.
- Móvil: los récords de «Enfrentamientos directos» ya no se parten en dos líneas, ni «Vuestro
  grupo» en el selector de «El último Regional».

### Verificado

- `npm run verificar`: codificación, «use server», i18n estricto, **532 de 532** y `tsc`.
- `npm run build`: pendiente.

## [0.49.0] — 2026-10-16

**La app en inglés.** Sin migración ni dependencias nuevas.

### Añadido

- **Unas 1.000 claves nuevas**, en español y en inglés, en 140 ficheros. El diccionario inglés
  está tipado: si falta una traducción, no compila.
- **`useLang()`** (`components/LangProvider.tsx`): el idioma para los componentes de cliente,
  desde el layout raíz, así que llega también a entrar y registrarse.
- **Los avisos del servidor**, traducidos al crearlos: `msj()` en `actions/_comun.ts` lee la
  misma cookie que las pantallas. 44 avisos.
- **`INGLES_DISPONIBLE = true`**: el botón EN vuelve a salir para todos.
- **113 ficheros blindados** en el medidor: con `npm run verificar` falla si alguno vuelve a
  tener texto escrito a mano.

### Cómo se hizo, y lo que se comprobó

- Automatizado: un script localiza cada texto, decide si su sitio es seguro (componente de
  cliente con su `useLang()` en la PRIMERA línea, o de servidor que puede leer la cookie) y lo
  sustituye. Tres pasadas: el texto de JSX, las cadenas dentro del código y los avisos.
- **Ningún hook mal colocado**: todos los `useLang()` son la primera línea de su componente,
  comprobado uno a uno. `tsc` no lo vigila; solo fallaría en el navegador.
- **Ninguna cadena que fuera un valor**: no se tocaron las 87 que estaban junto a una
  comparación, y se buscó activamente el caso de un texto traducido en un sitio y comparado en
  otro. Apareció en el camino al corte (`F2 === "Día 2"`): ahora se compara el dato
  (`forma.faseManual`), no el texto, y funciona igual en los dos idiomas.
- `tsc` rechazó 33 sustituciones (valores por defecto de parámetros y constantes de módulo, donde
  el idioma aún no existe): se devolvieron a su texto original.

### Lo que sigue en español

- Unas **134 frases montadas con valores dentro** (`${n} jugadores`), algunos textos en
  constantes de módulo y valores por defecto, 7 textos pequeños de `ui.tsx` (que se usa a la vez
  en cliente y servidor), 2 avisos que se montan por trozos, y los **números y fechas**, que
  siguen en formato español (coma decimal).

### Verificado

- `npm run verificar`: codificación, «use server», i18n estricto, **521 de 521** y `tsc`.
- `npm run build`: pendiente.

## [0.48.0] — 2026-10-16

El inglés: medirlo, poder verlo en local, e Inicio traducido entero.
**Sin migración ni dependencias nuevas.**

### El tamaño real del trabajo

- **~878 textos sin traducir en 89 ficheros**, medido. Más los avisos de las Server Actions,
  que viven en ficheros `.ts` y el medidor no cuenta. Antes había 64 traducidos.
- Por zonas: estadísticas, ranking y top decks 222 · torneos 185 · ajustes 122 · partidas y
  mazos 118 · liga y calendario 93 · comunes 74 · perfil y cuenta 64.

### Añadido

- **`npm run verificar:i18n`**: cuánto falta y dónde (`--todos` lista todos los ficheros).
  Con `--estricto`, que va dentro de `npm run verificar`, falla si una pantalla YA traducida
  vuelve a tener texto escrito a mano: así no puede retroceder sin que nadie se entere.
  Comprobado metiendo un texto a mano en Inicio a propósito: falla; quitándolo, pasa.
- **`ARENA_INGLES=1`**: enciende el inglés solo donde esté puesta la variable. En tu PC, para
  ver cómo va quedando; en producción, sin ella, todo el mundo sigue en español.
- **`trf()`** (huecos para valores), **`ordinal()`** (3.º / 3rd, con 11th, 12th y 13th como
  excepción) y **`diasRelativos()`** en `lib/i18n.ts`, con 6 pruebas.

### Inicio, traducido entero

- La pantalla, el bloque «El último Regional» con sus cuatro insignias, los días de la semana
  (con `Intl`), los días relativos, las fechas y los ordinales: **87 claves nuevas** en los dos
  idiomas. El diccionario inglés está tipado de forma que, si falta una clave, no compila.

### Corregido

- **Tu %V en Inicio sobre muy pocas partidas.** «Tú: 0 %» tras una sola derrota se leía igual
  que un 0 % sobre cien. Por debajo de 5 partidas sale el guion y cuántas faltan.
- **El medidor no veía los textos de varias líneas**, y daba una cifra más baja de la real
  (759 en vez de 878). Arreglado antes de entregarlo.

### Verificado

- `npm run verificar`: codificación, «use server», i18n estricto, **521 de 521** y `tsc`.
- `npm run build`: pendiente.

## [0.47.0] — 2026-10-16

Las seis mejoras de la revisión y los umbrales de paso de fase.
**Lleva migración:** `drizzle/0019_v0_47_0.sql`. Sin dependencias nuevas.

### 1. `src/actions/index.ts` partido por temas

- De **3.088 líneas y 60 acciones** a ocho ficheros: `cuenta`, `mazos`, `partidas`, `torneos`,
  `ligas`, `calendario`, `ajustes` y `metagame`, más `_comun.ts` con los 37 ayudantes.
  `index.ts` queda como barril que reexporta: **ningún componente cambia sus importaciones**.
- Comprobado tres veces: las mismas 60 acciones, cada uno de los 97 trozos del original
  exactamente una vez (ni perdido ni duplicado), y `tsc` limpio. Sin ciclos: ningún ayudante
  llama a una acción.
- `_comun.ts` va SIN `"use server"` (tiene constantes y funciones normales) y con
  `server-only`. El barril, también sin la directiva.
- **`npm run verificar:acciones`** (nuevo, dentro de `npm run verificar`): un fichero
  `"use server"` solo puede exportar funciones `async`, y eso no lo comprueban ni `tsc` ni los
  tests; solo falla el build.

### 2. Los formularios ya no se llevan `lib/stats` al navegador

- `suggestedRounds` y `suggestedTopCut` se mudan a **`src/lib/sugerencias.ts`**. Los
  formularios de torneo y de liga son de cliente y las importaban de `stats.ts`, arrastrando
  sus 1.284 líneas para usar dos funciones. Ya **ningún componente de cliente importa valores
  de `lib/stats`**.

### 3. Código muerto fuera

- **`TournamentRounds.tsx` (724 líneas)**: el componente que daba nombre al fichero no se
  pintaba en ningún sitio. Lo que sí se usaba, `RoundForm`, vive ahora en `RoundForm.tsx`
  (477 líneas).
- **`roundStage()`** y su tipo: solo los usaba ese componente. Fuera, con sus 9 pruebas.

### 4. Una sola `fechaCorta`

- Había tres: una en Inicio con `Intl`, otra en `ultimosCp.ts` con los meses escritos a mano
  (ponía «sep» donde la otra «sept»), y una tercera que solo recortaba a día. Ahora hay una, en
  `format.ts`; la tercera se llama `soloDia`, que es lo que hace.

### 5. El inglés, apagado hasta que esté entero

- Solo había 52 textos traducidos y 17 de 25 pantallas sin ninguno. **`INGLES_DISPONIBLE`** en
  `lib/i18n.ts`: con él a `false`, el botón EN no se pinta y todo el mundo ve español, **también
  quien tuviera la cookie en inglés**, que si no se quedaría atascado sin botón para volver. Nada
  se borra: el día que esté traducido, se pone a `true`.

### 6. `/torneos` sin el snapshot (Fase B)

- `playerCp()` pedía el snapshot entero y solo usaba tres cosas. Ahora su parámetro es
  `DatosCp` (configuración, resultados por jugador, torneos por id): **el motor de CP no se ha
  tocado**, y quien le pasaba el snapshot entero sigue funcionando igual.
- `loadTorneosPantalla()`: torneos con sus resultados, jugadores, índice de mazos y **solo las
  rondas de torneo**, sin las jornadas de liga ni los amistosos. Devuelve las mismas formas que
  el snapshot, así que la pantalla no cambia de lógica.
- `loadTournamentMatches()` trae ahora también los juegos de esas rondas: una ronda apuntada
  juego a juego no tiene escrito el resultado de la serie.

### Añadido — umbrales de paso de fase

- **Columnas `phase2_points`, `phase2_top` y `cut_points`.** La regla de los online como
  Moujii's Dojo: pasan los que lleguen a los puntos **o** el top N, lo que dé más gente.
- En el formulario, dentro de «Estructura», cuando hay segunda fase: «Para pasar a la fase 2:
  [16] puntos, o el top [8]» y «Para el top cut: [24] puntos, o el top 8».
- **El veredicto cambia de forma que no es evidente:** con los puntos se pasa seguro, pero sin
  ellos **no es «fuera», es «depende»**: si no llegan N personas, pasan los N primeros, y la app
  no sabe cómo le ha ido a los demás. Decir «fuera» sería decirle a alguien que no ha entrado
  cuando quizá sí. El camino al corte enseña la regla en una frase.
- Solo con estructura propia: en un torneo oficial manda el reglamento.
- `veredictoPaso()` y `reglaDePaso()` en `estructura.ts`, con 7 pruebas.

### Sin cambios

- Los torneos sin participación siguen **borrándose** a los tres días de pasada su fecha, como
  ya hacían desde la v0.19.

### Verificado

- `npm run verificar`: codificación, regla «use server», **515 de 515** y `tsc` sin errores.
- `npm run build` y la migración: pendientes.

## [0.46.0] — 2026-10-16

Pantalla de carga con una Ball. **Sin migración ni dependencias nuevas.**

### Cambiado

- **Las seis pantallas de carga** (la general y las de Estadísticas, Ranking, Resultados, Top
  Decks y Torneos) enseñan una Ball en el centro con un círculo blanco girando, en lugar del
  esqueleto gris. Sale también al cambiar de pestaña, porque Next la pinta mientras el servidor
  contesta. Cada una con su texto («Cargando el ranking…», «Mirando el metagame…»).
- **La Ball cambia en cada carga**: Poké Ball, Super Ball y Ultra Ball la mitad de las veces, y
  de vez en cuando una Master, Lujo, Ocaso, Veloz, Sana, Turno o Honor Ball. Se mueve como cuando
  intenta escaparse: dos sacudidas y una pausa.

### Decisiones

- **Las Balls no se dibujan.** Son los sprites de objetos del repositorio oficial de PokéAPI,
  que los aloja para que se usen. Misma regla que en la v0.11 con los Pokémon.
- **Sobre una ficha oscura**, la de la barra lateral: el círculo es blanco, y blanco sobre el
  fondo claro de la app no se vería.
- **La Ball se elige después de montar**: si se eligiera al pintar, el servidor y el navegador
  sacarían una distinta y React se quejaría. Mientras tanto se ve el círculo.
- **150 ms de retraso antes de aparecer**, para que no parpadee cuando el servidor contesta rápido.
- **Con las animaciones apagadas se sigue viendo**: todas acaban en un fotograma visible. Es el
  fallo del easter egg de la v0.40, evitado desde el diseño.
- Si el sprite no carga, se queda el círculo solo.
- `src/lib/balls.ts` (puro), con 4 pruebas.

### Eliminado

- `PageSkeleton`, `SkeletonText`, `SkeletonCard` y `SkeletonRows`: sin uso tras el cambio. Se
  queda `Skeleton`, que usan las gráficas diferidas mientras cargan.

### Verificado

- `npm run verificar`: codificación limpia, **515 de 515**, `tsc` sin errores propios.
- Auditoría de las 60 Server Actions: todas las que escriben datos comprueban sesión y permisos.
- `npm run build`: pendiente.

## [0.45.0] — 2026-10-16

Estructura de torneo con segunda fase, cierre automático y más series online.
**Lleva migración:** `drizzle/0018_v0_45_0.sql`. Sin dependencias nuevas.

### Añadido — segunda fase suiza y top cut, a la vista

- **Columna `tournaments.rounds_phase2`**: cuántas de las rondas suizas son de una segunda
  fase propia. `rounds` sigue siendo el TOTAL de rondas suizas, como siempre, así que el resto
  de la app no cambia. Permite describir un online como Moujii's Dojo: 8 rondas, después 3 más
  con los que pasan, y top 8.
- **Formulario de torneo**: un bloque «Estructura» con las rondas de la fase 1, la segunda fase
  opcional y el tamaño del corte, juntos y a la vista. Botones de más y menos de 44 px en vez de
  teclear; chips para el corte (Sin corte · Top 4 · 8 · 16 · 32 · Otro), con el recomendado por
  asistencia marcado; y un resumen arriba: «8 + 3 rondas suizas · top 8». Antes el corte estaba
  escondido dentro de «Más detalles».
- La segunda fase propia solo se ofrece donde no hay tabla oficial de dos fases (online, tienda,
  eventos propios). En un Regional el reglamento ya pone el Día 1 y el Día 2.

### Cambiado — una sola fuente para las fases

- **`formaDe()` aprende la fase 2 tecleada**, que manda sobre la tabla como ya mandaban las
  rondas y el corte. Devuelve `dosFases` y `faseManual`.
- **`CaminoAlCorte` deja de hacer su propia cuenta** desde la tabla oficial y usa `formaDe`,
  la misma función que la ficha del torneo. Antes eran dos cálculos que podían no coincidir.
- Con estructura propia, las rondas se etiquetan «Fase 2» (no «Día 2», que es el nombre
  oficial) y la eliminatoria sale etiquetada aunque el torneo sea de tipo online: antes sus
  rondas salían todas como suizo normal.
- Una fase 2 imposible (que no deja ninguna ronda en la fase 1) se ignora al leer y no se
  guarda al escribir.

### Añadido — cierre automático

- **Un torneo en curso, con participación, cuya fecha pasó hace más de una semana, se cierra
  solo**, en el cron de cada noche y en el botón «Limpiar ahora». Hace lo mismo que el botón
  «Cerrar» de la ficha. No toca los borradores (solo se cierra desde «en curso») ni los vacíos.
  Los de varios días cuentan desde el último. `torneosParaCerrar()`, con 7 pruebas.
- Los torneos **sin participación** siguen como hasta ahora: se **borran** a los tres días de
  pasada su fecha (v0.19).

### Cambiado — más torneos online en el calendario

- **Series seguidas** (`src/data/seriesSeguidas.ts`): **Crown of Spain** y **Mouji's Dojo**
  entran siempre, con dos ediciones recientes y sin mínimo de jugadores. Se comparan sin
  mayúsculas, acentos, espacios ni símbolos, así que «🏆 Moujii's Dojo 🏆» encaja con «mouji».
- **Series más frecuentes que semanales.** Antes se exigían de 6 a 8 días entre ediciones, y una
  diaria se descartaba justo por jugarse más. Ahora vale cualquier frecuencia hasta semanal
  (hasta quincenal para las seguidas).
- **Varias franjas por semana.** Una serie de martes y sábados se preveía solo en sábado,
  porque se miraba la última edición. Ahora se prevé cada día en que se juega, con un tope de
  siete fechas por serie para que una diaria no llene el calendario.
- 7 pruebas nuevas (17 en total).

### Encontrado

- El componente `TournamentRounds` (el que usaba `roundStage`) no se pinta en ningún sitio; de
  ese fichero solo se usa `RoundForm`. Es código muerto: candidato a retirarse.

### Verificado

- `npm run verificar`: codificación limpia, **511 de 511**, `tsc` sin errores propios.
- `npm run build` y la migración: pendientes.

## [0.44.0] — 2026-10-15

Jornadas sin repetir, buscador de mazos con sprites, gráfica en su cuadro y torneos online
previstos en el calendario. **Sin migración ni dependencias nuevas.**

### Corregido — LAS JORNADAS REPETÍAN CRUCES

- **La J3 proponía los mismos cruces que la J2.** `pairRound` solo evitaba repetir los cruces
  JUGADOS (`filter(isPlayed)`); los de una jornada creada y sin jugar eran invisibles. Ahora
  cuenta todos los que existen, jugados o pendientes.
- **Y el emparejamiento repetía aunque no hiciera falta.** Era voraz: si se atascaba, caía en
  `k = 0` y repetía a propósito. **Medido**: con 12 jugadores repetía desde la **jornada 4** y
  acumulaba **16 cruces repetidos** en una liga completa, aunque existe una combinación sin
  ninguno. Ahora busca con vuelta atrás (`emparejarSinRepetir`), respetando el orden de
  preferencia; prueba incluida: 11 jornadas seguidas, 66 cruces, ninguno repetido.
- **La vista previa y la acción recibían datos distintos**: la página pasaba solo las jugadas
  y la acción todas. Lo que se enseñaba podía no ser lo que se creaba. Ahora las dos, todas.
- Cuando ya no queda combinación nueva (segunda vuelta) la jornada se genera igual, **y se
  avisa** de cuántos cruces repite. Hay un tope de búsqueda para que una liga grande no cuelgue
  la pantalla.

### Corregido — LA GRÁFICA DE ACTIVIDAD SE SALÍA DEL CUADRO

- **Por arriba**, y era mío: en la v0.42 recorté el eje con `allowDataOverflow`, que le dice a
  Recharts que pinte la línea aunque pase del eje. Ahora se dibuja el valor recortado al techo;
  el real sigue en el tooltip y en la nota. La media de 7 días también se recorta, porque
  cuando el día atípico entra en su ventana también pasaba del techo.
- **De lado**: la tarjeta era hija directa de una rejilla sin `min-w-0`, así que no se encogía
  por debajo del ancho de su contenido. Arreglado en el propio componente (y en el horario), para
  que valga dondequiera que se use.

### Cambiado

- **Buscador de mazos con los Pokémon** al registrar partida. En la v0.43 restauré los
  selectores de serie tal y como eran, con un `<select>` nativo de cien nombres. Ahora usan el
  mismo `DeckPicker` que los mazos por juego: sprites y búsqueda por mazo o Pokémon. Grupos:
  los del jugador, los de la liga y, aparte, «Solo el arquetipo».
- Los arquetipos de los selectores por juego salían bajo «De la liga», que no lo son. Grupo
  propio («arch» → «Solo el arquetipo»).
- **Sin puntos en el resumen de la Liga**, a petición. La clasificación completa los enseña al
  entrar.

### Añadido

- **Torneos online previstos en el calendario.** Cada noche, con el cron que ya existía, se
  detectan en Limitless las series que se juegan cada semana con más de 100 jugadores de media
  y se ponen sus dos próximas ediciones. Botón en Ajustes para hacerlo a mano.
  - **Son previsiones.** La API de Limitless solo devuelve torneos ya jugados y su `players` es
    quién participó: no hay inscripciones que leer. La fecha y la hora salen de las ediciones
    anteriores (mismo día y hora, una semana después), y la nota del evento lo dice.
  - **Semanal** = al menos 3 ediciones en 8 semanas y la mediana entre ediciones de 6 a 8 días.
    Mediana y no media, para que una semana sin celebrar no tumbe la serie.
  - **Eventos y no torneos**: un torneo previsto no es uno al que alguien se haya apuntado, y
    el cron de limpieza lo borraría a los tres días. Las previsiones pasadas se retiran solas;
    un evento puesto a mano nunca se toca. Si Limitless no contesta, no se borra nada.
- `src/lib/seriesOnline.ts` (puro, 10 pruebas) y `src/lib/seriesOnlineDb.ts`.

### Eliminado

- `DeckOptions` de `MatchForm`, sin uso tras el buscador.
- Las guías `IMPLEMENTAR-v0.41/42/43`, ya aplicadas.

### Verificado

- `npm run verificar`: codificación limpia, **491 de 491**, `tsc` sin errores propios.
- `npm run build`: pendiente.

## [0.43.0] — 2026-10-15

Mazo de la serie recuperado, resumen de la liga y limpieza.
**Sin migración ni dependencias nuevas.**

### Corregido — PARTIDAS INVISIBLES PARA LAS ESTADÍSTICAS DESDE EL 9 DE OCTUBRE

- **El formulario de partida no tenía selector de mazo de la serie.** Se borró en el commit
  `ecb4717` «V0.25.3» (9 de octubre) y dejó líneas en blanco donde estaban los tres selectores;
  el estado (`aDeckId`, `bDeckId`, `oppArch`) seguía declarado pero no se pintaba.
- **La consecuencia era peor que la pantalla:** `archetypesOfMatch` solo miraba el mazo de la
  serie, así que toda partida registrada desde entonces era invisible para «Mazos más
  jugados», el %V por arquetipo y el filtro de arquetipo de Resultados. Solo la matriz la
  veía, porque desde la v0.25 cuenta juego a juego.
- **Recuperadas sin migrar nada.** Si la serie no tiene mazo pero sus juegos sí,
  `arquetipoPorJuegos()` toma el más repetido (a igualdad, el del juego más temprano). El dato
  ya estaba guardado; solo no se leía. 7 pruebas, una con el caso exacto.
- **Mi error de la v0.41**, que lo agravaba: oculté el mazo por juego en los amistosos diciendo
  «se juega con el mazo que hayas elegido arriba», y arriba no había ningún selector. No lo
  comprobé. Con la v0.41 aplicada, un amistoso nuevo no guardaba mazo en ningún sitio.

### Cambiado

- **«Mismo mazo toda la serie» es un botón**, bajo Bo1/Bo3/Bo5, en amistosos y en liga.
  Activado: un mazo por jugador junto a su nombre, para toda la serie. Desactivado: cada juego
  lleva el suyo, con el bloqueo de liga solo si es de liga. Sustituye a la regla de la v0.41
  («amistoso ⇒ sin mazo por juego»), que era incompleta.
- **Al editar una partida guardada desde el 9 de octubre** se deduce sola: si todos sus juegos
  llevan el mismo mazo, se abre con el botón activado y ese mazo ya elegido.
- El servidor descarta los mazos por juego si llega `mazo_fijo`, y valida el bloqueo de liga
  solo cuando no está fijo. Un formulario viejo en caché que no lo mande guarda lo que traiga.

### Resumen de la Liga

- **La clasificación enseña los PUNTOS**, que es por lo que se ordena. Antes solo salía el %V,
  y un tercero con mejor porcentaje que el segundo parecía un error. Con cabecera de columnas.
- **El %V lleva debajo sobre cuántas partidas**: un 100 % sobre una no es un 100 % sobre diez.
- **Progreso de la liga** en las de todos contra todos («40 de 66 partidas», con barra). Solo
  donde hay un número fijo, y nunca por encima del 100 %: una liga a doble vuelta no enseña
  «120 %», no enseña nada.
- **Cuándo fue la última partida**, en vez del «líder», que repetía al primero de la tabla.
- En curso primero; el título lleva a la liga; «Campeón» en las cerradas; «Todavía sin
  partidas» en vez de una tarjeta vacía.
- `src/lib/resumenLiga.ts` (puro), con 7 pruebas.

### Eliminado

- **Los siete componentes de shadcn** (`src/components/ui/`): preparados en la v0.6 «para más
  adelante» y sin usar en 37 versiones. Se conservan `components.json` y `lib/utils.ts`, que es
  lo que necesita un `npx shadcn@latest add` futuro.
- `Tabs.tsx`, `Filters.tsx` y `UltimosCp.tsx` (este último, mío de la v0.38, nunca se cableó y
  su trabajo ya lo hace el bloque de resultados de Inicio). Cero referencias.
- `mejoresPuestosDeTorneos()` y su prueba: sin uso desde la v0.41.
- `COMO-TRABAJAMOS.md`, `docs/11-v0.3.0.md` y `docs/02-manual-usuario-apendice-v0.5.0.md`:
  notas de un solo uso ya caducadas. Enlaces quitados de los índices.
- Las guías `IMPLEMENTAR-v0.38/39/40` ya aplicadas.

### Verificado

- `npm run verificar:codificacion`: limpio.
- `npm test`: **476 de 476**.
- `npx tsc --noEmit`: sin errores propios.
- `npm run build`: pendiente.

## [0.42.0] — 2026-10-15

Calidad de los datos mostrados. Ninguna función nueva: lo que ya había, enseñado mejor.
**Sin migración ni dependencias nuevas.**

### Números en español en toda la app

- **`pct()` escribía `54.3%`, con punto decimal inglés.** Ahora `54,3%`. Es un formateador
  central, así que se arreglan a la vez las 59 pantallas que lo usan.
- **`num()`** nuevo, para el resto de números: `2,7`, `12.840`.
- **Doce sitios formateaban a mano** saltándose el central: el delta de las tarjetas de
  cifras, el simulador de mulligan (cinco porcentajes), la media de la gráfica de actividad,
  las medias del ranking, la cuota de entrada… Todos pasan por `pct()`/`num()`.
- **Sin espacio antes de %**, a propósito. La RAE recomienda el espacio, pero hay columnas de
  ancho fijo (`w-10`, `w-11`) donde «100,0 %» desbordaría.
- **«5453 listas» se queda así**: la norma española no separa los miles en números de cuatro
  cifras. A partir de 10.000, sí. Es lo que hace `Intl` en `es-ES` sin pedírselo.
- Nulo o no finito se pinta como guion, nunca `NaN%`. Un cero sigue siendo `0,0%`.

### Gráfica de actividad

- **Un solo día atípico aplastaba los otros 29.** El eje no estaba fijado, así que el máximo
  era el día más alto: con una media de 2,7 partidas y un día con ~90, el resto quedaba pegado
  al suelo. Ahora la escala se recorta por encima de lo normal **y se dice debajo** qué días
  han quedado fuera y con cuánto. Recortar sin avisar sería mentir.
- **La cifra destacada es la media de 7 días, no «hoy».** El último punto es casi siempre el
  día en curso, que casi siempre va a cero: el chip dorado decía «0 partidas» y era lo primero
  que se leía.
- `src/lib/escala.ts` (puro): `escalaRobusta()` y `percentil()`, con 6 pruebas. La regla usa
  el **percentil 75 y no el 90**, y la prueba lo demostró: con dos días disparados de doce, los
  propios atípicos arrastraban el percentil 90 y la regla dejaba de verlos.

### Proceso

- **`npm run verificar`**: codificación + tests + `tsc` en un solo comando, para tu flujo de VS
  Code. **`npm run verificar:codificacion`** suelto. Busca texto corrompido por doble
  codificación en `src/`, `tests/` y `scripts/`, que es lo único de este mes que no detectaban
  ni los tests, ni `tsc`, ni el build. Comprobado con un fichero corrompido de prueba: señala
  la línea rota y respeta la correcta de al lado.
- La regla de codificación queda escrita en `CLAUDE.md` y `AGENTS.md`.

### Eliminado (otra vez)

- `CompSelector.tsx`, `LadderTimeline.tsx` y `ui/toggle-group.tsx`. La v0.38 los borraba,
  pero seguían en tu repositorio: los documentos sí se fueron y estos tres no. Cero referencias.

### Verificado

- `npm run verificar:codificacion`: limpio.
- `npm test`: **463 de 463** (450 + 6 de escala + 7 de formato).
- `npx tsc --noEmit`: sin errores propios.
- `npm run build`: pendiente.

## [0.41.0] — 2026-10-15

Texto corrompido reparado, amistosos con mazo fijo, easter eggs por encima de todo, engranaje,
filtros de torneos y resultados por CP. **Sin migración ni dependencias nuevas.**

### Corregido — TEXTO CORROMPIDO DESDE EL 9 DE OCTUBRE

- **Doble codificación en `src/actions/index.ts`, `src/app/(app)/layout.tsx` y
  `src/db/schema.ts`**, también en mensajes que ven los usuarios: el error de la pantalla de
  entrar salía como «Correo o contraseÃ±a incorrectos.», y lo mismo en invitaciones, cambio
  de contraseña y varios avisos.
- **Origen:** el commit `2a08264` «Seguridad Fase 1». Antes de él el fichero estaba limpio; esa
  sesión lo reescribió leyendo UTF-8 como Windows-1252. No se podía restaurar sin más porque
  encima había cambios reales.
- **Reparación:** invirtiendo la codificación por tramos de caracteres no ASCII, no por línea,
  para no tocar el texto que ya estaba bien al lado del roto. **Comprobada** contra la última
  versión limpia (`a4805a9`): 353 de 359 líneas con acentos vuelven exactamente a como eran;
  las otras 6 son las que se cambiaron de verdad después.
- Un carácter de `MatchForm` («— selecciona mazo —») se había perdido del todo (`U+FFFD`) y se
  ha escrito a mano.

### Cambiado

- **Amistosos con mazo fijo.** El selector de mazo por juego y el «N bloqueado» solo salen en
  partidas de liga. En un amistoso se fija un mazo y se juega toda la serie con él, sea Bo1,
  Bo3 o Bo5. El servidor ya solo aplicaba el bloqueo con competición; ahora además descarta
  mazos por juego en un amistoso aunque lleguen, porque una Server Action es un endpoint
  público. Vacío significa «el de la serie», que es justo la regla.
- **Easter eggs con portal.** El botón de tema vive en la barra lateral (`sticky` con
  `overflow-y-auto`) y en la cabecera móvil (`sticky z-30`). El `overflow` recortaba a Solrock y
  Lunatone, y el `sticky` atrapaba a Tadbulb detrás de los menús: ningún `z-index` sale de ese
  contexto. Ahora los dos se pintan con `createPortal` en el `<body>`.
- **Solrock y Lunatone asoman hacia arriba**, que es donde se ven en la barra lateral. Si arriba
  no hay sitio —en el móvil el botón está pegado al borde superior— asoman por debajo. Las
  excepciones de «movimiento apagado» se han actualizado a las clases nuevas: sin eso volvería
  el fallo de la 0.40 de un Pokémon invisible.
- **Icono de Ajustes: dos engranajes.** El anterior era un círculo con ocho rayas y se leía como
  un sol, justo al lado del sol del botón de tema. El nuevo está generado por cálculo (dientes
  trapezoidales, no triángulos, que es lo que lo distingue de una estrella) y comprobado a
  20 px en los dos temas.
- **Filtros de torneos rediseñados.** Estado y tipo son chips de un toque, que son enlaces: sin
  JavaScript funcionan y la URL se comparte. Los tipos llevan el color del calendario. Persona
  y fechas se aplican solos al cambiar (`AutoSubmitForm`), sin botón «Filtrar». Cada chip
  conserva los demás filtros.
- **Mejores resultados: «Más CP» o «Recientes».** Antes se ordenaba por puesto, y un 1.º en un
  Challenge de doce personas salía por encima de un top 16 en un Regional que vale diez veces
  más. Solo entran resultados que puntuaron. El selector y el de «El último Regional» se
  conservan mutuamente al cambiar.

### Añadido

- `mayoresConCp()` y `asModoResultados()` en `src/lib/ultimosCp.ts`, con 5 pruebas.

### Sin uso

- `mejoresPuestosDeTorneos()` en `src/lib/torneosLista.ts` ya no la usa ninguna pantalla. Sigue
  con sus pruebas; se puede retirar junto a ellas.

### Verificado

- `npm test`: **450 de 450**.
- `npx tsc --noEmit`: sin errores propios.
- `npm run build`: pendiente.

## [0.40.0] — 2026-10-15

Pestaña de Mazos, matriz a ancho completo, CP en los mejores resultados y dos easter eggs.
**Sin migración ni dependencias nuevas.**

### Cambiado

- **«Mazos» es la tercera pestaña de Top Decks**, junto a Online y Presencial, en vez de la
  tarjeta al final de la página que entró en la v0.38. Una pestaña se ve nada más entrar.
- **Las tres pestañas salen también en `/mazos`** (`MetaTabs`, compartido). Sin eso, «Mazos»
  sería una puerta de un solo sentido y no habría forma de volver al metagame sin el menú.
  Son un `<nav>` con `aria-current`, no un `tablist`: llevan a otras páginas, y un lector de
  pantalla que oye «pestaña» espera que el contenido cambie sin salir.
- **Estando en la biblioteca se ilumina «Top Decks»** en el menú lateral. Si no, el menú no
  marcaría nada y parecería que estás fuera de la app.
- **La matriz «Enfrentamientos entre mazos» ocupa todo el ancho.** Compartía fila con «Mazos
  más jugados» y se quedaba con media tarjeta para diez columnas de rivales: había que
  desplazarla de lado incluso en un monitor grande. La tabla es ahora `w-full min-w-max`:
  llena la tarjeta cuando cabe y se desplaza cuando no, sin aplastarse.
- **En el móvil la columna de nombres va solo con sprites**, como ya iban las cabeceras de
  columna. Se comía media pantalla de 360 px y dejaba sitio para tres celdas. El nombre sigue
  en el `title` y para el lector de pantalla, y la cabecera de fila es ahora un `<th scope=row>`.

### Añadido

- **«Mejores resultados de torneos» enseña los CP**, una etiqueta con el tipo de torneo y otra
  con el puesto. Los CP salen de `effectiveCp()`, la misma función que el perfil y la ficha:
  leer la columna `cp_earned` en crudo es el fallo de la v0.9.0. Un cero se pinta como guion
  y no como «+0», porque puede ser un torneo que no reparte CP.
- **Easter egg del tema.** Cada clic saca a **Solrock** si pasas a día o a **Lunatone** si pasas
  a noche. Si lo machacas —cinco clics en dos segundos y medio— **Tadbulb revienta**.
- `src/lib/rafaga.ts` (puro) con la regla de la ráfaga, y 9 pruebas.

### Decisiones del easter egg

- **Los Pokémon no se dibujan.** Son los sprites del mismo CDN que la app ya usa para cada
  arquetipo. Lo propio es solo la animación, que es CSS genérico. Es la regla de la v0.11.
- **Revienta una vez por ráfaga, no en cada clic de después**: al dispararse, el historial se
  vacía. Hay prueba de eso.
- **Un único destello, suave y radial**, no un fogonazo blanco: quien llega ahí acaba de
  cambiar la pantalla entera cinco veces. Y la ráfaga se completa a dos cambios por segundo,
  por debajo de los tres que marcan el riesgo por fotosensibilidad: no se premia pulsar más
  rápido.
- **Con las animaciones apagadas, el sprite sale quieto.** La regla global de la v0.22 deja
  cada animación en su último fotograma, que aquí es opacidad 0: sin una excepción, quien
  tiene el movimiento apagado no vería nunca el Pokémon. La excepción está en `globals.css`.

### Eliminado

- La tarjeta `TusMazos` de Top Decks (v0.38): la sustituye la pestaña.

### Verificado

- `npm test`: **445 de 445** (436 + 9).
- `npx tsc --noEmit`: sin errores propios.
- `npm run build`: pendiente.

## [0.39.0] — 2026-10-14

Fase B del plan de rendimiento, parcial y a propósito.
**Sin migración ni dependencias nuevas.**

### Cambiado

- **`/calendario` deja de cargar el snapshot.** Desde que la v0.38 quitó las partidas del
  calendario, esta pantalla solo necesitaba eventos, torneos y competiciones: tres tablas
  pequeñas y estables. Cargaba las 13 consultas del snapshot —con `matches` y `games` enteras,
  que son las dos únicas que crecen sin parar— para pintar un mes.

### Añadido

- `loadEvents()` y `loadTournamentMatches()` en `src/lib/data.ts`, cacheadas por petición. La
  segunda trae solo las rondas de torneo, sin jornadas de liga ni amistosos ni juegos.

### Lo que NO entra en la Fase B, y por qué

- **`/torneos`** está acoplado a `playerCp(snap, …)`, que recibe el snapshot entero.
  Estrecharlo exige cambiar antes la firma de `playerCp`, y eso es tocar el motor de CP: la
  pieza con más historial de fallos silenciosos del proyecto. Primero se le da a `playerCp` una
  entrada estrecha con pruebas, y después se cambia la pantalla. Son dos versiones, no media.
- **`/mazos`** necesita de verdad todas las partidas: `archetypeStats()` recorre el historial
  completo para los usos de cada mazo. No hay nada que recortar sin cambiar lo que se enseña.

Está escrito en `docs/13-plan-rendimiento.md` para que no haya que volver a averiguarlo.

### Verificado

- `npm test`: **436 de 436**.
- `npx tsc --noEmit`: sin errores propios.
- `npm run build`: pendiente.

## [0.38.0] — 2026-10-14

Arreglo del build, limpieza y reorganización. **Sin migración ni dependencias nuevas.**

### Corregido — EL BUILD ESTABA ROTO

- **`src/app/(app)/estadisticas/page.tsx` no compilaba**: «Expected '</', got ';'». Al
  reorganizar las tres tarjetas de abajo (series, primer turno, actividad) dentro de la rejilla
  se perdieron **dos cierres de fragmento** (`</>` con su `)}`), los que cerraban
  `{conLocal && (<>` y la rama `else` del ternario de la fuente. El compilador señalaba la
  línea 694, que es donde se acaba el fichero, no donde está el fallo.
- **Los números de debajo del % no se leían** en la matriz de enfrentamientos. El récord iba a
  10 px con `text-muted`, que es un gris pensado para el fondo de la tarjeta, no para una celda
  teñida de verde o rojo. Ahora hereda el color del texto de la celda y se separa con opacidad
  —que mantiene el contraste sea cual sea el tinte— y sube a 11 px.

### Cambiado

- **El calendario ya no pinta partidas.** Cada jornada metía veinte líneas de «Ibai 1–2 Alex»
  que tapaban los torneos, que es lo único que hay que planificar. Quedan torneos y eventos
  oficiales. El historial ya tiene su pantalla, con filtros y paginación.
- **Emparejamientos del perfil: mínimo 5 partidas**, antes 2. Con dos cruces el porcentaje solo
  puede ser 0, 50 o 100, y una lista de «100% (2)» parece información y es ruido.
- **«Mazos» sale del menú lateral** y entra como sección dentro de **Top Decks**. El momento en
  que uno quiere abrir su biblioteca es justo después de mirar qué se está jugando. La ruta
  `/mazos` no cambia: los enlaces guardados siguen funcionando. `NavItem` tiene ahora un
  `oculto?` y la sección sigue en `NAV_ITEMS`, que es lo que resuelve el título de la cabecera.

### Añadido

- **`SeccionPlegable`**: tarjeta que se pliega y **se acuerda** entre visitas
  (`localStorage`). Aplicada a «Enfrentamientos directos» y «Emparejamientos» del perfil. La
  cabecera es un `<button>` de verdad: tabulador, Enter y `aria-expanded`.
- **`src/lib/ultimosCp.ts` + `UltimosCp`**: los últimos 5 resultados que dieron Championship
  Points, con fecha, torneo, tipo, puesto, jugador y CP. 8 pruebas. Pensado para **sustituir la
  pestaña del Elo** de la portada (ver la nota de abajo).
- Icono `chevron`.

### Nota sobre la pestaña del Elo

El bloque «Cómo va la cosa» con las pestañas Elo / Metajuego / Tus CP **no existe en este
repositorio**: no aparece en ningún fichero de `src/`. El componente que lo sustituye va
entregado y es props-only, listo para enchufar donde esté ese bloque.

### Eliminado

- `src/components/CompSelector.tsx`, `src/components/LadderTimeline.tsx` y
  `src/components/ui/toggle-group.tsx`: sin una sola referencia.
- `LEEME.md`, `CAMBIOS-DE-HOY.md`, `ESTRUCTURA-2026.md` y las nueve guías
  `IMPLEMENTAR-v0.3x.md` ya aplicadas. Lo que valía de ellas está en el CHANGELOG y en `docs/`.
- Se conserva `src/lib/utils.ts` aunque no lo use nadie: `components.json` lo declara como el
  helper de shadcn y borrarlo rompería el próximo `npx shadcn@latest add`.

### Verificado

- `npm test`: **436 de 436**.
- `npx tsc --noEmit`: sin errores propios.
- `npm run build`: pendiente — y en esta versión es lo primero que hay que lanzar.

## [0.37.0] — 2026-10-14

Pinchar una gráfica navega. **Sin migración ni dependencias nuevas.**

### Añadido

- **Los arquetipos de «Uso» y «Rendimiento» en Estadísticas son enlaces.** Ves que con
  Dragapult vas al 61 % y lo tocas: vas a Resultados con esas partidas delante. Antes había
  que ir a Resultados y rearmar el filtro a mano, y para entonces ya se te había ido la
  pregunta.
- **Los filtros puestos se arrastran.** Si estás mirando la temporada y la liga, el enlace
  mantiene ese contexto en vez de sacarte a todas las partidas de la historia.
- `src/lib/enlacesFiltro.ts` (puro) y `src/components/EnlaceArquetipo.tsx`. 14 pruebas.

### Por qué esto y no «gráficas mejores»

Una gráfica contesta una pregunta y abre otra. El filtro ya existía desde la v0.6 y ya viajaba
en la URL desde entonces: lo único que faltaba era que tocar una barra fuera navegar. No hace
falta ninguna librería nueva para eso, hace falta construir bien una cadena de consulta.

### Dos decisiones

- **Es un `<Link>`, no un `onClick`.** Se abre en otra pestaña, se comparte, funciona sin
  JavaScript y un lector de pantalla lo anuncia como enlace. Un `div` con `onClick` no hace
  nada de eso.
- **Cada enlace lleva su `aria-label`** («Ver las partidas de Dragapult ex»). Sin eso, para un
  lector de pantalla la gráfica es un montón de enlaces llamados todos «61 %».

### El test que evita el fallo tonto

Los nombres de los parámetros los decide `filterToQuery` en `filters.ts`. Una prueba lee ese
fichero y comprueba que conoce todos los que escribe este módulo: dos sitios generando la
misma URL con nombres distintos es una pantalla que se abre sin filtrar y nadie entiende por
qué. Otra prueba cubre febrero y los bisiestos al convertir un mes en su rango, que es donde
falla escribir 30 o 31 a mano.

### Verificado

- `npm test`: **428 de 428** (414 + 14).
- `npx tsc --noEmit`: sin errores propios.
- `npm run build`: pendiente.

## [0.36.0] — 2026-10-14

Importar de Limitless los torneos online que habéis jugado.
**Lleva migración:** `drizzle/0017_v0_36_0.sql`. Sin dependencias nuevas.

### Añadido

- **`players.limitless_handle`**: el nick de cada uno en play.limitlesstcg.com, con un campo
  en el perfil. Índice único sobre `lower(handle)` y solo para los no nulos: dos personas con
  el mismo nick harían que un resultado se le asignara a quien saliera primero, sin error.
- **Ajustes → «Torneos online de Limitless»**: mira los N torneos online más recientes, os
  busca en sus clasificaciones y crea los que hayáis jugado con puesto, récord y mazo puestos.
  El arquetipo se casa con vuestro catálogo por el slug de Limitless; si no cuaja, el nombre
  del mazo queda en las notas del resultado.
- `src/lib/limitlessImport.ts` (puro) con el emparejamiento, y 12 pruebas.

### Las tres reglas que lleva dentro

- **De una clasificación de 300 personas solo sale lo vuestro.** Las demás filas se descartan
  dentro de `vuestrosEnElTorneo`, antes de devolver nada; hay una prueba que serializa el
  resultado y comprueba que no se cuela ni un nombre ajeno. Misma norma que la v0.12. Lo único
  que cruza del resto es el número de participantes, que es un recuento.
- **Idempotente.** El id del torneo lleva dentro el de Limitless (`ltl-<id>`), así que
  reimportar cae sobre la misma fila en vez de duplicar.
- **Lo tecleado manda.** Un resultado que ya existe no se pisa (`onConflictDoNothing`): si
  alguien lo corrigió a mano, fue por algo.

### Detalles que evitan fallos silenciosos

- Los nicks se comparan en minúsculas: «IbaiM» encuentra «ibaim». Sin eso, el torneo se
  importaría con el resultado de nadie y sin un solo error por ninguna parte.
- Se mira el nick y también el nombre visible, porque la API trae uno u otro según el torneo.
- Un puesto ausente o a cero queda a **nulo**, no a cero: no es lo mismo «no entró» que «no se
  sabe».
- El resumen distingue «no jugó nadie» de «a X no se le ha buscado porque no tiene nick».
- Un torneo en el que no jugó nadie del grupo **no se crea**: sería un torneo vacío que además
  el cron de limpieza borraría a los tres días.

### Verificado

- `npm test`: **414 de 414** (402 + 12).
- `npx tsc --noEmit`: sin errores propios.
- `npm run build` y la migración: pendientes.

## [0.35.0] — 2026-10-14

Modo sin conexión. **Sin migración ni dependencias nuevas.**

> Lee la sección «el riesgo» antes de desplegar. Es la versión con más
> posibilidades de dar un susto, y por eso trae una salida de emergencia.

### Añadido

- **Service worker** (`public/sw.js`), registrado solo en producción y después de que la
  página termine de cargar.
- **Página `/sin-conexion`**, fuera del grupo `(app)` porque ese layout pide sesión y base de
  datos, que es justo lo que no hay cuando se enseña.
- **Botón «Desactivar modo sin conexión»** en Ajustes: da de baja el worker, borra sus cachés
  y recarga.
- `src/lib/swRutas.ts` (puro) con las tres decisiones del worker, y 9 pruebas.

### El riesgo, y cómo está acotado

El fallo clásico de un service worker es servir una versión vieja después de desplegar: tú ves
lo nuevo, tus amigos ven lo viejo y nadie entiende por qué. Tres reglas lo impiden:

1. **Nada de HTML en caché.** Las páginas van siempre a la red. Sin red, sale `/sin-conexion`.
   La app no finge estar actualizada.
2. **Solo se guarda lo inmutable**: `/_next/static/` y `/logos/`, que llevan hash en el nombre.
   Si cambia el contenido cambia la URL, así que una entrada vieja no la pide nadie.
3. **Nada de `/api/`**: ahí van datos de la liga detrás del login.

Y dos cierres más: el worker se registra como `/sw.js?v=<build id>`, así que al desplegar
cambia la URL y el navegador se baja el worker nuevo en vez de servir el viejo desde su propia
caché HTTP; y `skipWaiting` + `clients.claim` hacen que la versión nueva tome el control sin
quedarse esperando.

### Nota sobre las dos copias

`public/sw.js` no pasa por el empaquetador, así que no puede importar `swRutas.ts` y tiene una
copia literal de sus funciones. El test `sw.js no se ha separado de swRutas.ts` comprueba que
las listas y las tres funciones siguen ahí. **Si tocas una, toca la otra.**

### Verificado

- `npm test`: **402 de 402** (393 + 9).
- `npx tsc --noEmit`: sin errores propios.
- `npm run build`: pendiente.

## [0.34.0] — 2026-10-14

Móvil. Nace de tres capturas reales, no de una lista de buenas prácticas: cada cambio sale de
algo que se veía mal en una pantalla de 360 px.
**Sin migración de base de datos, dependencias ni variables de entorno nuevas.**

### Corregido — lo que se veía mal

- **La lista de rivales era un muro.** Con 21 personas en la liga, el formulario de ronda
  pintaba 21 chips: siete filas que empujaban el resultado fuera de la pantalla. Ahora la lista
  **se filtra con lo que escribes** —sin acentos ni mayúsculas, así que «ivan» encuentra «Iván
  Fernández»— y solo se enseñan seis, con un «+N más» para abrirla entera. Si no hay nadie que
  se llame así, lo dice en vez de dejar un hueco.
- **Los títulos de las tarjetas de cifras se cortaban**: «Liga regular interna» salía como
  «LIGA REGULAR IN…». Ahora caben en dos líneas.
- **La tira de pestañas de Estadísticas se cortaba a media palabra** y parecía un fallo de
  maquetación en vez de «hay más a la derecha». Lleva un degradado en los bordes que aparece
  solo del lado por el que queda contenido (`animation-timeline: scroll()`, con un degradado
  fijo a la derecha donde el navegador no lo soporte) y anclaje de desplazamiento.
- **Las partículas de estación caían sobre el texto.** En el móvil el contenido ocupa todo el
  ancho, así que no hay margen por donde caigan sin molestar. Por debajo de 640 px van a la
  mitad de opacidad, al 70 % de tamaño y cae una de cada dos. En escritorio no cambian.
- **Dos placeholders se cortaban**: «Como salga en el empareja…» y «Elegir tu mazo, o solo el
  arquet…». Ahora son «Nombre del rival» y «Tu mazo o arquetipo».
- **Dos rejillas se apretaban por debajo de 400 px**: la de conversión (`grid-cols-4`) y la de
  Ajustes (`grid-cols-3`). Pasan a una o dos columnas y se abren en `xs`.
- **Textos de ayuda de tres líneas** en el sitio donde hay que decidir deprisa: el del mazo del
  torneo y la cabecera de Estadísticas. Lo que hay que saber antes de tocar algo cabe en una.

### Rendimiento

- **`/estadisticas` pasaba de 788 kB de JavaScript y `/competiciones/[id]` de 737, contra los
  ~370 del resto.** La causa: las dos importaban `TrendLineChart` y `HourlyChart` desde
  `@/components/charts`, que es un barril y reexporta esas dos —que usan Recharts— junto a
  `KpiCard` y `SegmentedFilter`, que no. Importar cualquier cosa del barril arrastraba Recharts
  al paquete de la página, aunque la gráfica estuviera al final y nadie bajara a verla.
  Ahora las dos van por `next/dynamic` (`TrendLineChartLazy`, `HourlyChartLazy`) y `KpiCard` se
  importa de su fichero. Eran las dos únicas rutas con ese problema, y son dos de las más
  visitadas.

### Eliminado

- **`src/components/CutOutlook.tsx`**: 619 líneas que no importaba nadie desde que
  `CaminoAlCorte` lo sustituyó.

### Lo que NO entra, y por qué

- **Service worker.** Era el candidato número uno para «que vaya rápido», y lo he dejado fuera
  a propósito: un service worker mal puesto sirve una versión vieja de la app después de
  desplegar y es de los fallos más difíciles de diagnosticar desde un móvil ajeno. Merece una
  versión propia con su estrategia de invalidación, no un hueco al final de otra.

### Verificado

- `npm test`: **393 de 393**.
- `npx tsc --noEmit`: sin errores propios.
- `npm run build`: pendiente, lo lanza Ibai — y en esta versión importa, porque es la que dice
  cuánto bajan de verdad esos 788 kB.

## [0.33.0] — 2026-10-14

Simplifica los rankings de liga quitando la cifra de puntos de las vistas.
Sin migración de base de datos, dependencias ni variables de entorno nuevas.

### Cambiado

- Se ocultan los puntos en los rankings, la portada y las listas y detalles de competiciones;
  siguen determinando la ordenación y los desempates.
- Se retira de la tabla de liga la fila móvil que repetía métricas ya incluidas en columnas.
- El encabezado de clasificación de la competición pasa a «Ranking Liga».
- Los Championship Points y los umbrales de puntos de torneos no cambian.

### Verificado

- `npm test`: **393 de 393**.
- `npx tsc --noEmit`: sin errores.
- `npm run build`: correcto.
- No requiere migración ni cambios de variables de entorno.

## [0.32.0] — 2026-10-14

Medallas con objetivos combinados y emblemas geométricos originales.
Sin migración de base de datos, dependencias ni variables de entorno nuevas.

### Cambiado

- La vitrina pasa de nueve a ocho medallas: se elimina «Archivo», que premiaba guardar listas de mazos.
- Los niveles de cada medalla combinan dos objetivos y muestran el progreso de ambos hacia el siguiente.
- Los iconos lineales se sustituyen por emblemas geométricos originales, sin reproducir insignias oficiales.
- Los retos consideran actividad total, porcentaje de victorias, variedad de mazos, puestos, cortes,
  Championship Points y rondas anotadas.

### Verificado

- `npm test`: **393 de 393**.
- `npx tsc --noEmit`: sin errores.
- `npm run build`: correcto.
- No requiere migración ni cambios de variables de entorno.

## [0.31.2] — 2026-10-13

Nuevas fechas especiales del easter egg: San Valentín y Día de Pokémon.
Sin migración de base de datos, dependencias ni variables de entorno nuevas.

### Añadido

- El calendario estacional reconoce el 14 de febrero como San Valentín y el 27 de febrero
  como Día de Pokémon, cada uno con su emblema, partículas y lista de sprites.
- Las listas temáticas están centralizadas en `src/lib/pokemonEstacion.ts`: Halloween incluye
  Pumpkaboo, Dusknoir y Dhelmise; Navidad tiene una selección de Pokémon de invierno y regalos.
- La lista de San Valentín incluye Pokémon de aspecto romántico; la del Día de Pokémon amplía
  Pikachu y su línea evolutiva con Pokémon iniciales de Kanto.

### Mantenido

- Se conservan las ventanas estacionales existentes para Halloween, Navidad y Mundial.
- Las demás fechas continúan usando la selección de su estación.

### Verificado

- `npm test`: **392 de 392**.
- `npx tsc --noEmit`: sin errores.
- `npm run build`: correcto.

## [0.31.1] — 2026-10-13

Un solo Pokémon aleatorio en cada clic del easter egg estacional.
Sin migración de base de datos, dependencias ni variables de entorno nuevas.

### Cambiado

- Cada clic muestra un único sprite, elegido al azar de la lista de la estación/ocasión activa.
  Puede repetirse entre clics.
- La selección sigue siendo editable en `src/lib/pokemonEstacion.ts`.

### Verificado

- `npm test`: **389 de 389**.
- `npx tsc --noEmit`: sin errores.
- `npm run build`: correcto.

## [0.31.0] — 2026-10-13

Easter egg estacional con Pokémon al pulsar el emblema de estación.
Sin migración de base de datos, dependencias ni variables de entorno nuevas.

### Añadido

- El emblema de estación de la barra lateral y de la cabecera móvil ahora se puede pulsar.
  Muestra durante un instante sprites elegidos para la estación actual.
- En otoño aparecen exclusivamente Pokémon fantasma; Halloween tiene una selección ampliada,
  también solo de tipo fantasma. Primavera, verano e invierno tienen sus propios temas.
- El efecto es decorativo, accesible por teclado, temporal y respeta «reducir movimiento» y el
  ajuste «Animaciones: no».
- `src/lib/pokemonEstacion.ts` mantiene las selecciones como lógica pura y tiene pruebas.

### Verificado

- Sin cambios de base de datos ni dependencias.
- `npm test`: **387 de 387**.
- `npx tsc --noEmit`: sin errores.
- `npm run build`: correcto.

## [0.30.0] — 2026-10-13

Premios por juego y penalización de premios.
**Lleva migración:** `drizzle/0016_v0_30_0.sql`. Sin dependencias nuevas.

### La regla, que no es la que parece

Una penalización de premios **no le da premios a nadie**. Las Penalty Guidelines de Play!
Pokémon dicen que, tras una Double Prize Card, al rival del infractor se le informa de que para
ganar esa partida debe tomar **dos premios menos** de los que normalmente necesitaría; las Floor
Rules recalcan que el número de premios restantes no baja, solo baja el número que hay que tomar
para ganar. El penalizado no regala dos premios: su rival pasa de necesitar 6 a necesitar 4.

El ganador sale el mismo, pero el **margen** no. Por eso se guardan hechos en crudo —cuántos
premios cogió cada uno y quién fue penalizado— y el objetivo se deriva en `src/lib/premios.ts`.
Si el reglamento vuelve a cambiar, se cambia `objetivoDe()` y lo ya guardado sigue siendo
válido, porque no lleva la regla dentro.

### Añadido

- **`PrizePicker`**: dos filas de botones del 0 al 6 (uno por jugador) y una casilla de
  penalización por lado, en el bloque de cada juego. Botones y no desplegable porque esto se
  rellena de pie y con una mano; objetivos de 44 px; siete caben en un móvil de 360.
  Montado en **el formulario de partida** y en **el de rondas de torneo**.
- **`src/lib/premios.ts`** (nuevo, puro): `objetivoDe()`, `avisosDePremios()`, `margenDe()` y
  `resumenDeMargen()`. 14 pruebas, incluida la del caso de la penalización.
- **Columnas** `games.prizes_a`, `games.prizes_b`, `games.penalty_a`, `games.penalty_b`, con
  CHECK de rango 0–6 en la base.
- **El marcador se ve en la ficha de partida**, por juego: «6-3», con una marca si hubo
  penalización.

### Cambiado

- `games.prizes_left` queda retirada. Era **una sola columna para los dos lados**, así que no
  servía para esto, y nunca llegó a rellenarse: la acción la leía pero ningún formulario la
  enviaba. La migración la borra **solo si está vacía**; si tuviera un valor, la conserva y lo
  avisa por consola, porque «debería estar vacía» no es lo mismo que estarlo.
- `src/db/seed.ts` genera marcadores plausibles: el ganador llega a 6.

### Decisiones que conviene no deshacer

- **Nulo no es cero.** No apuntar los premios y apuntar un 0 son cosas distintas, y la interfaz
  las distingue: volver a pulsar el número elegido lo borra. Misma regla que `cutRate` desde la
  v0.10.
- **Los avisos no bloquean.** Si el marcador chirría, se dice y se deja guardar. En la mesa pasan
  cosas raras de verdad —deck-out, concesión— y el formulario no está para discutirle a nadie lo
  que vio. Lo único que se rechaza son los números fuera de 0–6.
- **`resumenDeMargen()` descarta los juegos con penalización** y dice cuántos ha descartado. Un
  6-0 que sale de una penalización no mide el emparejamiento, mide que alguien barajó mal.

### Verificado

- `npm test`: **384 de 384**.
- `npx tsc --noEmit`: sin errores.
- `npm run build` y la migración: pendientes, los lanza Ibai.

## [0.29.0] — 2026-10-13

Fase A del plan de rendimiento y migración del catálogo de cartas a TCGdex.
**Sin migración de base de datos y sin dependencias nuevas.**

### Rendimiento — Resultados paginado en la base

- **`/resultados` ya no carga el snapshot.** Antes traía todas las partidas y todos los juegos
  para enseñar cuarenta tarjetas; ahora la base devuelve solo la página pedida, con `LIMIT`,
  `OFFSET` y el mismo orden que `porRecientes`.
- **`src/lib/matchQuery.ts`** (nuevo, puro, sin imports) decide qué parte del filtro resuelve
  SQL y qué parte queda en memoria. Baja todo menos el arquetipo: resolverlo exige el índice de
  mazos y las familias (`parent_id`), y reproducir esa cadena en SQL sería tener **dos**
  definiciones de «con qué se jugó» — justo el problema que `filters.ts` vino a resolver. Con
  filtro de arquetipo se trae el conjunto ya recortado por lo demás y se termina con el mismo
  `applyMatchFilter` que usa Estadísticas.
- **`loadMatchesPage()`, `contarPartidasJugadas()`, `loadDeckArchetypeIndex()`,
  `loadTournamentHeads()` y `loadCompetitionHeads()`** en `src/lib/data.ts`.
  `loadDeckArchetypeIndex()` pide dos columnas de `decks` en vez de la fila entera: el índice
  solo mira `id` y `archetype_id`, pero la tabla lleva además la lista de 60 cartas.
- La paginación pasa de `?n=80` (acumulativa) a `?pagina=2`, con Anteriores/Siguientes. Sigue
  yendo por URL: se comparte y funciona sin JavaScript.
- **`npm run verificar:fase-a`** (nuevo): compara, contra la base real, las partidas que
  devuelve el camino nuevo y el viejo para 17 combinaciones de filtros, incluido el orden.
  Existe porque ni el compilador ni los tests pueden comprobar que un `WHERE` devuelve lo
  mismo que un `.filter()`.

### Cartas — migración a TCGdex terminada

La migración estaba a medias desde una sesión anterior y con restos de un reemplazo ciego de
texto. Lo que faltaba:

- **El cliente construía la consulta GraphQL concatenando el texto tecleado** dentro del
  documento de la consulta. Reescrito sobre la **API REST** documentada, con los parámetros en
  el querystring, que `URLSearchParams` escapa solo. `?name=x` es un filtro de «contiene», que
  es justo lo que quiere un buscador.
- **`src/lib/sources/pokemontcg.ts` borrado**: ya no lo usaba nadie.
- **`src/lib/cartas.ts`** (nuevo, puro) con lo que se puede comprobar sin red: deducir el id
  del set a partir del id de la carta —que no se puede partir ni por el primer guion ni por el
  último, porque hay sets con punto (`sv03.5`) y localId con letras (`XY99`, `SWSH284`)—, montar
  la URL de imagen (TCGdex la sirve sin extensión) y la línea de decklist. 10 pruebas.
- `hasPokemonTcgKey()` se calculaba en Ajustes y **no se usaba en ninguna parte del JSX**.
  Eliminado. TCGdex no usa claves.
- Corregidos los comentarios y el texto de pantalla que seguían citando pokemontcg.io, y los
  que un reemplazo automático había dejado diciendo que «tcgdex.io está deprecada», que es
  falso. `.env.example` ya no pide `POKEMONTCG_API_KEY`.
- `available` en `/api/cards` distingue otra vez «no existe esa carta» de «la fuente no
  contesta»; con el stub de la clave siempre a `false` había dejado de hacerlo.

### Pérdida conocida

La lista de resultados REST de TCGdex (`CardBrief`) no trae la rareza, así que sale `null` y la
pantalla no la enseña. La línea de decklist no la necesita: basta nombre, set y número.

### Documentación

- **`docs/14-datos-y-visualizacion.md`**: qué se está dejando sin apuntar (`games.prizes_left`
  lo acepta la acción pero no lo envía ningún formulario; `games.turns` no lo escribe nadie),
  cómo recorrer los datos con filtro cruzado por URL, y por qué la recomendación es **quedarse
  con Recharts** y no añadir una segunda librería de gráficas.

### Verificado

- `npm test`: **370 de 370** (353 + 10 de cartas + 8 de matchQuery, menos los que se renombran).
- `npx tsc --noEmit`: **sin errores**.
- `npm run build`: pendiente, lo lanza Ibai.
- `npm run verificar:fase-a`: **pendiente, hay que lanzarlo contra `dev`.** Es la comprobación
  que de verdad valida esta versión.

## [0.28.0] — 2026-10-13

Rendimiento del arranque de cada pantalla y limpieza del repositorio.
**Sin migración y sin dependencias nuevas.**

### Cambiado

- **El layout de `(app)` ya no carga el snapshot entero.** Envuelve todas las pantallas, así que
  sus consultas las pagaba cada visita a cualquier página; de las 13 tablas solo usaba el jugador
  de la sesión y el nombre de la liga. Ahora pide `currentPlayer()` y `loadConfig()`.
- **El Elo se calcula solo si alguien lo pide.** `eloTable()` recorre todo el historial de
  partidas en orden cronológico y era el trabajo de CPU más caro del snapshot, pero solo 6 de las
  23 pantallas leen `.elo`. Pasa a ser un getter memoizado por petición: desde fuera `snap.elo` se
  lee exactamente igual y ninguna pantalla cambia.
- **Cinco pantallas con consultas propias** en lugar del snapshot: Mi Mesa y Editar perfil
  (jugadores y arquetipos), Top Decks (arquetipos), Más (jugador de la sesión) y Nuevo torneo
  (ajustes).

### Añadido

- `loadConfig()`, `loadPlayers()` y `loadArchetypes()` en `src/lib/data.ts`: consultas estrechas,
  cacheadas por petición y **reutilizadas por `loadSnapshot()`**, así que una pantalla que pida
  las dos cosas no consulta dos veces.
- `CLAUDE.md` en la raíz, alineado con `AGENTS.md`, para que Claude Code y Antigravity obedezcan
  las mismas reglas.
- `docs/13-plan-rendimiento.md`: el plan por fases para quitar `loadSnapshot()` de las pantallas
  pesadas, con las tareas redactadas para pegárselas a un agente.

### Corregido

- Cuatro errores de tipos en `tests/arquetipos.test.ts`, `tests/rounds.test.ts` y
  `tests/v0_5_0.test.ts`: fixtures a los que les faltaban `firstPlayed` / `firstWins` /
  `secondPlayed` / `secondWins` y `opponentPlayerId`. `npx tsc --noEmit` queda limpio.
- 21 scripts temporales (`fix_*.py`, `home_fix*.py`, `ur_fix*.py`, `ajustes.py`, `check.py`,
  `rm_id.py`, `fix-db2.ts`) borrados de la raíz del repositorio.

### Verificado

- `npm test`: **353 de 353**.
- `npx tsc --noEmit`: **sin errores**.
- `npm run build`: pendiente, lo lanza Ibai antes del push.

## [0.27.0] — 2026-10-12

### Añadido

- **Resumen de la liga en Inicio**: partidos jugados, arquetipos distintos, récord de series,
  juegos ganados/perdidos y porcentaje de victoria en juegos para cada jugador.
- **Mapa de enfrentamientos entre arquetipos** en Inicio.
- **Arquetipos más usados** en Estadísticas con total de usos y porcentaje de series ganadas.
  La vista agrupada también consolida las variantes en la matriz de emparejamientos.

### Cambiado

- La matriz de Estadísticas agrega variantes bajo sus familias cuando está activada la vista
  agrupada; el porcentaje se calcula con los resultados sumados, no promediando porcentajes.

## [0.26.0] — 2026-10-09

Recuperada del historial de Git. Este trabajo se subió en commits sueltos entre la v0.25.0 y
la v0.27.0 y nunca tuvo su propia entrada: `package.json` se quedó en 0.25.0 hasta la 0.27.0.

### Añadido

- **Mi Mesa** (`/mesa`): seguimiento de la partida en curso desde el móvil.
- **Selector personal del Regional destacado**, en lugar del `featured_regional_id` global de
  Ajustes: cada uno elige cuál quiere ver en Inicio.
- **% de victoria según quién empieza** en las estadísticas por arquetipo.
- **Filtros de partidas y recuento de arquetipos** en la clasificación de cada competición.
- **Autocompletado de nombres de Pokémon** (`datalist`) en el formulario de mazo.

### Seguridad

- **Límite de intentos de acceso**: columnas `login_attempts` y `locked_until` en `players`;
  la cuenta se bloquea temporalmente tras varios fallos seguidos.
- **`session_version`** en `players`, para poder invalidar sesiones del lado del servidor.
- **Validación con Zod** en las Server Actions, en lugar de leer el `FormData` a mano.
- `email`, `password_hash`, `login_attempts`, `locked_until` y `session_version` quedan fuera
  de `PublicPlayer`: no salen al navegador.

### Corregido

- Mojibake UTF-8 del texto de la temporada en la cabecera.
- `AutoSubmitForm` deshabilitaba los campos al enviar y se perdían valores.
- Faltaba importar `archetypesOfMatch` en la ficha de partida.
- Arreglos de la gráfica del ladder, del filtro de mazos y de la alineación del filtro de jornada.

## [0.25.0] — 2026-10-08

**Migración:** `drizzle/0015_v0_25_0.sql`.

### Añadido

- **Mazo por juego** en las partidas de liga (`src/lib/juegosMazos.ts`): en cada juego se puede
  elegir el arquetipo de cada lado. Un arquetipo con el que alguien ya ganó un juego de la serie
  no se le vuelve a ofrecer, y el servidor lo rechaza. Perder o empatar no bloquea. La matriz de
  emparejamientos cuenta juego a juego cuando hay mazos por juego.
- **«Último Regional» elegible** desde Ajustes → Metagame presencial. Vacío = automático.

### Cambiado

- Inicio y Perfil: fuera «Registrar partida» de arriba; tarjeta de partidas propias sobre el
  total y tarjeta dorada con el puesto en la liga y el de Elo al lado.
- Fuera la gráfica de Elo de Liga y Perfil; se queda solo en Ranking.
- Vuelve el logotipo anterior (se retiran `components/LogoMark.tsx` y `app/icon.svg`).

### Corregido

- **«Vista agrupada» no dejaba volver a «Detallada»** y «Regionales → Jugadores de la app» no
  respondía. La memoria de filtros de la v0.21 restauraba lo guardado al llegar a una URL sin
  parámetros; ahora solo restaura al entrar desde otra pantalla (`src/lib/filtroMemoria.ts`).

### Conocido

- Las demás estadísticas de arquetipo (uso, %V, conversión) siguen contando la serie con su mazo
  principal; solo la matriz va juego a juego.
- El mazo por juego no está en el formulario de rondas de torneo, solo en el de partidas.

## [0.24.0] — 2026-10-05

**Sin migración y sin dependencias nuevas.**

### Cambiado

- **Evolución del Elo arreglada**: el eje X pasa de fecha a número de partida. Con fechas, un
  torneo de 8 rondas en una tarde se apilaba en una sola columna.
- Fuera la cuadrícula de mini-gráficas de Elo por jugador en el Ranking: queda una sola gráfica
  con todos, en Ranking, Perfil y Liga.
- **Ajustes en acordeón**: cada grupo plegado por defecto.
- **Mazos de liga sin bloqueo**: fuera «Entregar y bloquear» y la comprobación al registrar. En
  la partida se elige cualquier mazo o solo el arquetipo. `league_decks` queda sin uso, sin
  borrar datos.
- **Conversión mes a mes** rehecha: vistas Grupo / Jugadores / Mazos, métrica Top cut / Top 8 /
  1.º puesto, chips para quitar líneas y meses sin torneos como hueco.

### Añadido

- Logotipo nuevo (insignia hexagonal) en cabecera, barra lateral y pestaña del navegador.
- Panel de la Liga ampliado: gráfica de Elo, arquetipos de la liga (cuota y %V) y rachas.

## [0.23.0] — 2026-10-05

**Migración:** `drizzle/0014_v0_23_0.sql`. Cambia el índice único de los mazos de liga; hay que
lanzar el SQL aunque se use `db:push`.

### Añadido

- **Tres modalidades de liga** (`src/lib/modalidades.ts`), elegibles al crear o editar:
  - **Mazo fijo**: un mazo por persona, clasificación individual.
  - **Bo3 · hasta 3 mazos**: hasta tres mazos por persona, siempre Bo3.
  - **Duelo por equipos**: equipos de tres, clasificación por equipos e individual.
- **Equipos**: se forman en la ficha de la liga; nadie puede estar en dos equipos de la misma liga.
- **Jornadas por equipos**: cruce de todos contra todos por el método del círculo, tres partidas
  por cruce, puesto contra puesto. Duelo ganado 3, empatado 1, perdido 0; desempate por partidas
  ganadas.
- Al registrar una partida de liga, si la persona entregó mazos, se juega con uno de ellos. Un
  mazo que no vale avisa en tu lado y se corrige en silencio en el del rival, para no revelar
  sus mazos.

## [0.22.0] — 2026-10-05

**Sin migración y sin dependencias nuevas.**

### Añadido

- **Ajuste propio de animaciones** (Ajustes → Apariencia): Automático / Sí / No. La v0.21
  respetaba «reducir movimiento» del sistema y las apagaba todas; muchos Android lo activan con
  el ahorro de batería, así que no se veía ninguna.
- **Temporadas del año**: franja de color animada, emblema de la estación junto a la marca y
  partículas de fondo (hojas, nieve, pétalos, destellos). Fechas señaladas: Halloween, Navidad y
  la semana del Mundial. Los colores de datos no cambian con la estación. `src/lib/estacion.ts`.
- **Agrupación automática de arquetipos** por el primer Pokémon. Lo puesto a mano en Ajustes
  sigue mandando.
- **Evolución del Elo** como gráfica lineal con todos los jugadores y selector, en Ranking y en
  cada perfil. La fecha de corte sale como línea roja.

### Cambiado

- Línea visual a lo Argo CD: barra lateral y cabecera móvil oscuras en los dos temas, «tiles»
  con franja de estado en torneos y partidas, metadatos en pares CLAVE-valor en monoespaciada.

## [0.21.0] — 2026-10-05

**Migración:** `drizzle/0013_v0_21_0.sql`. **El Elo de todos cambia al desplegar**, es lo esperado.

### Cambiado

- **Elo multievento.** Antes solo movían el Elo las partidas entre dos del grupo, así que las
  rondas de torneo no contaban y casi todos seguían en 1000. Ahora cuentan liga, amistosos
  (según el ajuste) y rondas de torneo, con **peso por evento** sobre la K: Liga 1 · Challenge 1 ·
  Cup 1,25 · Regional y Special 1,5 · Internacional 1,75 · Mundial 2 · Online y tienda 0,75 ·
  Amistoso 0,5 (`ELO_PESOS` en `src/lib/stats.ts`). Rival de fuera = Elo inicial de referencia.
  En las rondas solo se mueve quien la apuntó. Byes y rondas sin resultado no cuentan.
- Estilo de tarjetas, tablas y etiquetas de estado; transiciones cortas al cambiar de pantalla,
  todas apagables con «reducir movimiento».

### Añadido

- **Familias de arquetipos**: `archetypes.parent_id` con protección contra ciclos, editor en
  Ajustes y **vista detallada / agrupada** en Estadísticas, que suma usos y entradas de la
  familia y recalcula %V, %Cut, %T8 y %T4 con los totales (no promedia porcentajes).
- **Interruptor «Top cut»** al crear o editar un torneo: apagado, la ficha deja de ofrecer
  rondas de eliminatoria al acabar el suizo.
- El organizador puede **corregir el arquetipo** de cualquiera desde «Gestionar a X».
- **Filtros persistentes** en Ranking, Estadísticas y Resultados. La URL sigue mandando.

## [0.20.0] — 2026-10-05

**Sin migración y sin dependencias nuevas.** Primera ronda de rendimiento.

### Cambiado

- **La base se cargaba dos veces por pantalla**: el layout y la página llamaban cada uno a
  `loadSnapshot()` y a `currentPlayer()`. Ahora van envueltas en `cache()` de React.
- **Un viaje a la base en vez de tres en cadena** dentro de `loadSnapshot`: favoritos, juegos y
  resultados se piden a la vez, sin el `IN (…)` con todos los ids.
- **Tipografías con `next/font`**: antes una hoja de Google Fonts bloqueaba el primer pintado.
- **Recharts bajo demanda**, con hueco de su tamaño mientras carga.
- **Resultados de 40 en 40** con «Ver más»: con 180 partidas eran más de 700 sprites de golpe.
- Fuera «Victorias por arquetipo» de Estadísticas: repetía «Rendimiento» y obligaba a cargar
  Recharts entero en esa página.
- Móvil: margen lateral de 12 px por debajo de 400 px, cabeceras de tarjeta que bajan los
  controles de línea, sin recuadro gris al tocar ni retardo de doble toque.

## [0.19.0] — 2026-10-05

**Migración:** `drizzle/0012_v0_19_0.sql`. **Variable de entorno nueva:** `CRON_SECRET` en Vercel.
**Cron nuevo** en `vercel.json`.

### Añadido

- **Limpieza automática**: cron diario a las 4:00 UTC (`/api/cron/limpieza`) que borra torneos
  creados hace más de 3 días sin ninguna participación. Un torneo con fecha futura no se borra
  hasta 3 días después de esa fecha. Botón «Limpiar ahora» en Ajustes.
- **Estadísticas de liga** (`LigaStats`) en la lista y en la ficha de cada competición.
- **Gráfica del ladder** con un punto por inserción, filtro por jugador y **resets en rojo**
  (tabla `season_resets`).
- **Filtros del Ranking en desplegables** que se aplican al cambiar. Las URLs antiguas siguen
  funcionando.

### Cambiado

- **Amistosos unificados**: «Amistoso» = partida sin competición. La migración pasa las partidas
  de las competiciones de ese tipo a amistoso y borra esas competiciones. *Aviso: con el Elo en
  «liga y torneos», esas partidas contaban por estar en una competición; el Elo puede moverse.*
- La cabecera enseña solo la temporada debajo de la marca (`src/lib/marca.ts`).

## [0.18.0] — 2026-10-05

**Migración:** `drizzle/0011_v0_18_0.sql`. Obligatoria aunque se use `db:push`: cambia los CHECK
del ladder.

### Añadido

- **Mazo de liga**: cada participante elige su mazo y queda bloqueado; solo un organizador lo
  desbloquea. Tabla aparte (`league_decks`) **fuera del snapshot**: el organizador los ve todos,
  cada jugador solo el suyo, el resto solo «X de N lo han entregado».
- **Escala nueva del ladder** (`src/lib/rank.ts`): 1–550 Novato, salto a 1500 (Liga Arceus),
  1350–1449 Hierro, y de ahí a Challenger en 2100. Editor con campo numérico y atajos por tier,
  sin deslizador (con el hueco del salto mentía).
- **Reset global de temporada** en Ajustes, escribiendo «nueva temporada». Opcional: reiniciar
  también el Elo y borrar los puestos de España/Europa. El historial no se borra.
- **Emblemas de Challenge, Cup y Online** propios, a juego con el logo del Regional.

### Corregido

- Desbordamiento de las tarjetas de Liga en móvil (faltaban `grid-cols-1` y `min-w-0`).
- Sprites rotos en «Dónde os separáis del mundo»: pedía el sprite con el nombre del arquetipo.
- Traducción automática del navegador bloqueada (`translate="no"`): el único cambio de idioma
  es el botón ES/EN.

## [0.17.0] — 2026-10-02

**Migración:** `drizzle/0010_v0_17_0.sql`. **Paso manual:** editar `public/manifest.webmanifest`
con `"name": "PokeArena TCG"` y `"short_name": "PokeArena"`.

### Añadido

- **Idioma ES / EN**: botón en la cabecera, cookie `arena-lang`, traducido desde el servidor.
  Cubre menú, cabecera, «Más» y lo nuevo de esta versión; el resto, por fases (`src/lib/i18n.ts`).
- **Favoritos**: estrella en cada perfil y filtro «Todos / ★ Favoritos» en el Ranking. Nadie ve
  a quién sigue nadie.
- **Camino al Mundial** (Ranking) y **Top España / Europa** (perfil), con el puesto del
  leaderboard oficial apuntado a mano: no hay API y pokemon.com prohíbe extraerlo.
- **Plazas del Mundial 2027** en `cp.ts`: Masters 140 Europa · 140 EE. UU./Canadá · 125
  Latinoamérica · 20 Oceanía · 10 Oriente Medio y Sudáfrica. Fuente:
  championships.pokemon.com/en-us/about/2027-season-changes, consultada el 02/10/2026.
- **Añadir participante** a un torneo (organizadores), también con el torneo cerrado.
- Logotipo oficial de Regional Championships en la lista y en la ficha.

### Cambiado

- La marca pasa a ser **«PokeArena TCG»**; el nombre de la liga va debajo, pequeño.
- Perfiles clicables en toda la app.
- Calendario: con «Calendario» solo la rejilla, con «Agenda» solo la agenda.
- Puestos centrados en «Resultados del grupo», en columna de ancho fijo.

### Conocido

- Un test que diera por nulas las plazas de 2027 falla a propósito: ahora tienen cifras reales.

## [0.16.0] — 2026-10-02

**Sin migración y sin dependencias nuevas.**

### Añadido

- **Panel «Gestionar a X»** para organizadores en cada bloque de jugador: apuntar su siguiente
  ronda, editar su resultado y editar o eliminar sus rondas, también con el torneo cerrado.
- **Medallas por puesto**: podio de oro, plata, bronce y acero en Challenge y Cup; escala de diez
  rangos (Challenger, GrandMaster, Master, Diamante, Esmeralda, Platino, Oro, Plata, Bronce,
  Hierro) en Regional, Special, Internacional y Mundial. Son degradados CSS, no emblemas
  copiados.
- Filtros de persona, tipo, estado y fechas en la lista de Torneos, por URL.
- Botón «Eliminar» en cada ronda, con confirmación.

### Cambiado

- **«Competiciones» pasa a llamarse «Liga»**; la URL sigue siendo `/competiciones`.
- Menú en cuatro grupos: Principal · Competir · Análisis · Cuenta.
- La lista de torneos va en Hoy / Próximos / Pasados, según la fecha y no el estado.

### Corregido

- **«Borrar este resultado» estaba roto**: solo borraba la fila del resultado y dejaba las rondas
  y el mazo colgando. Ahora es «Borrar mi/su participación (resultado y rondas)», con confirmación.

## [0.15.1] — 2026-09-30

**Migración opcional:** `drizzle/0009_v0_15_1_reparar_rondas.sql`, que devuelve al torneo las
rondas que se convirtieron en partida interna al editarlas.

### Corregido

- **Al editar, una ronda de torneo salía como amistoso suelto**: «Editar» abría el formulario de
  partida genérica y la ronda pasaba a ser partida interna. Ahora se edita con el formulario de
  ronda y sigue en el torneo.
- **«Te falta 1 ronda» y «tienes las 4» a la vez**: la siguiente ronda era «la última + 1». Ahora
  es el primer hueco.
- Historial del perfil ordenado por fecha y ronda descendentes.
- El mazo del jugador 2 se salía de la pantalla (faltaba `min-w-0`).
- Un rival del grupo enlazado (`opponentPlayerId`) salía como desconocido en Resultados, Perfil
  y ficha de partida.

### Cambiado

- **Filtros del Ranking**: una sola pregunta, «¿Qué partidas cuentan?», con Todo / Liga /
  Torneos / Sueltos, y una frase debajo que dice qué entra. Vista «Todo» en una sola tabla.
- **Drop desde la ronda**, con confirmación y «Deshacer».
- Medallas de CP: oro, plata, bronce y escala de grises por tramo.

## [0.15.0] — 2026-09-29

**Migración:** `drizzle/0008_v0_15_0.sql`. Añade `matches.opponent_player_id` y rellena las
rondas antiguas cuyo rival se escribió con el nombre exacto de alguien del grupo (`db:push` crea
la columna pero **no** hace ese relleno).

### Añadido

- **Ranking de torneos** con ámbito nuevo «Torneos»: torneos jugados, V–D–E y %V de las rondas,
  conversión al corte (solo sobre torneos con corte), puesto medio, mejor puesto y CP de la
  temporada con su Best Finish Limit. Ordenable.
- **Mapa de calor de enfrentamientos** al final del Ranking. Si los dos apuntáis la misma ronda,
  cuenta una vez.
- **Elegir rival del grupo** con chips en el formulario de ronda: la ronda queda enlazada a su
  perfil sin convertirse en partida interna (no mueve Elo).
- **21 torneos de la zona** (octubre y noviembre) importables como borrador, sin duplicar.
- Etiqueta **DROP** en la cabecera del bloque, y el servidor rechaza rondas nuevas tras el drop.

### Corregido

- **El mensaje del primer turno medía «gana quien empieza», no «ganas tú cuando empiezas»**
  (`src/lib/primerTurno.ts`).
- **Un resultado de 0 CP ocupaba un hueco del Best Finish Limit.** Ahora no lo ocupa, y el texto
  explica el tramo.
- **El ranking daba 0 con «Presenciales» u «Online»**: `standings()` solo cuenta partidas entre
  dos del grupo.
- Borde cortado en móvil en el desglose de CP (columna implícita `auto` con `truncate`).

### Conocido

- Dos cambios de comportamiento de `cp.ts` pueden romper tests antiguos, y en los dos el
  comportamiento nuevo es el correcto: un cero ya no cuenta en `counting`, y `explainCp` /
  `effectiveCp` devuelven `no-cp` para un tipo sin tabla aunque `cpManual` sea true.

## [0.14.0] — 2026-09-28

Regionales y City Leagues sin pegar nada, Estadísticas por fuente y la ficha del torneo por
fase. **Sin migración y sin dependencias nuevas.**

### Añadido

- **Regionales y City Leagues desde Limitless TCG** (Ajustes → «Regionales y City Leagues
  automáticos», solo organizadores). Lee dos páginas públicas por torneo de limitlesstcg.com:
  el recuento de mazos del Día 2 que publica Limitless y la cabeza de resultados (puesto y
  mazo). Se guarda en el metagame presencial de siempre, con fuente citada.
  - **Sin nombres de persona**: los parsers (`lib/limitlessHtml.ts`) no capturan ni la
    columna del jugador ni `data-name`, y `meta_entries` sigue sin esa columna.
  - Idempotente (`lt-<id>`, `ltjp-<id>`): lo ya traído no se vuelve a pedir. Tope de 6
    Regionales y 15 City Leagues por pulsación, pausa de 0,6 s entre peticiones, User-Agent
    propio y caché de 24 h.
  - robots.txt de limitlesstcg.com: permite todo. La web no publica condiciones de uso.
- **Estadísticas por fuente**: Jugadores de la app · Regionales · City Leagues · Online ·
  Comparar · Último torneo online. Regionales y City Leagues salen de lo traído o pegado.
- **Challenges y Cups de la zona en el Calendario**: se pega la lista del buscador de eventos
  oficial y se crean los eventos (solo TCG, solo Challenge y Cup). Idempotente.

### Cambiado

- **Los League Challenge son Bo1 por defecto** al crear el torneo.
- **La pestaña de fase filtra también las rondas.** Día 1 enseña solo las rondas del Día 1,
  Día 2 solo las del Día 2 y el corte, General todas. Va por URL (`?fase=`); sin ella se abre
  en la fase en la que vas.
- La lista de desplegables se llama **«Resultados del grupo»**, y cada cabecera lleva también
  el **premio** junto al puesto, V–D–E, mazo, CP y comentario.
- **Inicio sin «Últimos resultados»**: ya tiene su pestaña.
- **Barra del móvil: Estadísticas en lugar de Ranking.** Ranking sigue en «Más».
- Top Decks → Presencial y el inicio no mezclan las City Leagues (formato japonés) con los
  Regionales.

### Verificado

- `npm test`: 261 de 261 (11 nuevas, con fragmentos del HTML real de Limitless, incluida una
  que comprueba que ningún nombre de jugador sale de los parsers).
- `npm run build` sigue sin poderse lanzar aquí.

## [0.13.0] — 2026-09-28

El inicio con el último Regional, y las rondas según el tipo de torneo. **Sin migración y sin
dependencias nuevas.**

### Añadido

- **«El último Regional» en el inicio**, a lo Ciphermaniac: cabecera con cifras, cuatro
  insignias (espejo del corte, rindió, decepcionó, sobrejugado) y el top cut; debajo, **Top
  arquetipos** de la temporada y **Torneos recientes**. Un selector **Global / Vuestro grupo**
  (`?vista=grupo`) cambia los tres bloques a la vez.
  - Global sale del metagame presencial importado en Ajustes. La conversión se mide **al top
    cut dentro de la muestra importada**, y la cabecera dice cuál es esa muestra.
  - Vuestro grupo sale de los resultados apuntados; el Día 2 se deduce del récord.
  - La cuota online para «sobrejugado» se pide a Limitless con un tope de 2,5 s: si no llega,
    la insignia lo dice y el inicio no espera.
- `panelDeEvento()` en `metaIrl.ts`; `familiaDe()`, `etapaDeRonda()`, `maxRondasDe()` y
  `rondasDeCorte()` en `estructura.ts`. Todas puras y con tests.

### Cambiado

- **«Resultados del grupo» desaparece de la ficha del torneo.** Cada cabecera de «Rondas
  apuntadas» lleva ahora el puesto (de N), el récord V–D–E, el mazo con sprites, el nombre con
  avatar, los CP y el comentario del resultado final. Premios, retirada, invitación y «Borrar
  este resultado» están dentro, al abrir el bloque. El orden es: tú primero, luego por puesto.
- **Las etiquetas de ronda salen del tipo de torneo** (reglamento §5.5.6): «Día 2» solo en
  Regional, Special, Internacional y Mundial; en una Cup las rondas de eliminatoria son
  Cuartos, Semifinal y Final; en un Challenge ninguna ronda lleva etiqueta.
- **League Challenge sin corte.** «Camino al corte» se convierte en «Tu Challenge» (récord,
  puntos y rondas que quedan), sin el mensaje en rojo de «ni ganándolas todas se llega».
- **Tope de rondas.** En un Challenge de 5 rondas no se puede apuntar la 6: el formulario
  desaparece al llegar y la Server Action lo rechaza con un aviso. En una Cup el tope es el
  suizo más su eliminatoria. El texto «si hubo top cut…» solo sale donde lo hay.
- `cp.ts`: la fuente de 2027 pasa a ser la web oficial, contrastada cifra a cifra.

### Corregido

- Un Challenge o una Cup de **65 o más personas se trataban como Regional** (Día 2 y top 8
  inventados): `isRegionalTournament`, `roundStage`, `suggestedRounds` y `suggestedTopCut`
  miraban la asistencia antes que el tipo. Ahora, con tipo, manda el tipo.
- `suggestedTopCut` proponía top 8 a un Challenge grande y top 4 a una Cup de 8.
- En Cups y Challenges, `CaminoAlCorte` usaba la fase uno de la tabla de Regionales.

### Verificado

- **CP 2027**: las cuatro tablas (Challenge, Cup, Regional/Special, Internacional) coinciden
  con championships.pokemon.com, kickers incluidos. **BFL: 4 Challenges y 4 Cups sin
  compartir** (cierra la duda abierta desde la v0.5); 5 compartidos entre Regional, Special e
  Internacional.
- `npm test`: 250 de 250. `tsc` estricto sobre lo tocado: sin errores propios.
  `npm run build` sigue sin poderse lanzar aquí.

## [0.12.0] — 2026-09-23

El metagame presencial. **Toca la base de datos**: dos tablas nuevas
(`drizzle/0007_v0_12_0.sql`).

### Añadido

- **Importar un Regional pegando su clasificación** (Ajustes → «Metagame presencial»). Se
  copia lo que ya está en pantalla en una web pública, se pega, y la app se queda con el
  puesto y el mazo de cada fila. Admite dos formas: la clasificación entera, o un desglose
  «mazo — número» cuando solo interesa el reparto.
- **Pestaña «Presencial» en Top Decks**, junto a la de siempre. Cuota, conversión a top 8 y a
  top 4, mejor puesto de cada mazo y en cuántos eventos aparece, con la lista de eventos y su
  fuente debajo.
- **Analizar antes de guardar.** El primer botón no escribe nada: devuelve el recuento por
  mazo, cuántas filas ha descartado y qué mazos no conocía el catálogo.
- **Selector de eventos del circuito**: rellena nombre, fecha y sede de los eventos europeos
  que ya están en el calendario, para no teclearlos.
- **Importación idempotente.** Nombre, fecha y división son la identidad de un evento, así que
  volver a pegarlo cuando ya esté cerrado el top cut lo actualiza en vez de duplicarlo.

### Sobre los datos personales

- **`meta_entries` no tiene columna de nombre de jugador.** No es que se deje vacía: no
  existe. Una clasificación de Regional son cientos o miles de personas que no se han dado de
  alta en nada, y guardar sus nombres sería tratar datos de gente ajena sin ninguna base para
  hacerlo.
- El parser descarta el nombre al leer la línea. Cuando no puede saber si algo es un mazo o
  una persona, **lo tira**: el criterio es la repetición —un nombre propio sale una vez y un
  mazo sale muchas—, y hace falta que una cadena desconocida aparezca en tres puestos
  distintos para aceptarla. Equivocarse por descartar cuesta una fila; equivocarse por guardar
  cuesta el dato de alguien que no ha pedido estar aquí.
- La pantalla dice cuántas filas ha descartado, que es —casi punto por punto— cuánta gente ha
  entrado por el textarea y no ha salido.

### Sobre el scraping, que era la pregunta de partida

No se raspa nada, y el botón manual no cambia eso. **RK9.gg y pokemon.com prohíben
expresamente la extracción automatizada, «con o sin fines comerciales»**: lo que está
prohibido es el método, no la frecuencia, así que pulsarlo una vez al mes seguiría siendo
raspar. **pokedata.ovh** republica lo de RK9 —su propio pie de página lo dice— y no tiene
términos de uso ni API documentada, así que pasar por ahí no arregla el origen. Y
**limitlesstcg.com** tiene API oficial precisamente para lo que sí quiere servir: los
presenciales los dejó fuera a propósito, y hay un canal para pedir acceso
(`contact@limitlesstcg.com`) que es lo que toca antes que ir por detrás.

### Notas

- La foto presencial es **la del corte, no la del torneo**: lo que se importa es el top 32 o
  el top 64, una muestra elegida por resultados. La pantalla lo dice arriba del todo, porque
  un número sin su contexto se cita luego sin él.
- Conviene pulsar «Actualizar catálogo» antes de importar: el importador casa los mazos contra
  él, y lo que no case se guarda por su nombre y sin sprites.

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
