# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

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
