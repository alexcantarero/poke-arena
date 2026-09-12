# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

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
