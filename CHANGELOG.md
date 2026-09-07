# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

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
