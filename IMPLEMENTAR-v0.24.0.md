# PokeArena TCG v0.24.0 — cómo aplicarla

Va sobre tu **v0.23.0** (`v0_23_0.zip`, con tus cambios en `FilterPanel.tsx` y `TournamentForm.tsx`,
que se conservan). **Sin migración y sin dependencias nuevas.**

1. Descomprime encima del repo.
2. `npm test` (58 de 58) y `npm run build`. Push.
3. Opcional: borra `src/components/statistics/ConversionChart.tsx` y `src/components/LadderTimeline.tsx`
   (ya no los usa nadie). Si tienes `public/favicon.ico`, bórralo para que mande el icono nuevo
   (`src/app/icon.svg`).

## Qué trae

- **Logo nuevo** (`components/LogoMark.tsx`, `app/icon.svg`): insignia hexagonal con dos katanas
  cruzadas y un orbe dorado. En la cabecera, la barra lateral y la pestaña del navegador.
- **Evolución del Elo arreglada:** el eje X pasa de fecha a **nº de partida** (las fechas siguen en
  las etiquetas). Con fechas, un torneo de 8 rondas en una tarde se apilaba en una columna; ahora
  cada línea avanza partida a partida, arranca en el Elo inicial y se conecta bien.
- **Fuera la cuadrícula de mini-gráficas** del Elo por jugador en el Ranking. Queda una sola gráfica
  con todos (Ranking, Perfil y ahora también la Liga).
- **Ajustes en acordeón:** cada grupo (Invitaciones, La liga, Datos del metagame, Regionales,
  Metagame presencial, Jugadores, Apariencia, Tu cuenta, Zona de riesgo) plegado por defecto.
- **Mazos de liga sin bloqueo:** fuera «Entregar y bloquear» y la comprobación al registrar. En la
  partida se elige cualquier mazo o **cualquier arquetipo** («Solo el arquetipo»), para los dos
  lados. La modalidad Bo3 sigue exigiendo series al mejor de tres. Las tablas `league_decks` quedan
  sin uso (no se borran datos).
- **Panel de la Liga ampliado:** gráfica de Elo, arquetipos de la liga (cuota y %V) y rachas
  (actual y mejor de cada uno), además de lo que ya había.
- **Conversión mes a mes** rehecha: vista Grupo / Jugadores / Mazos (los 6 con más resultados),
  métrica Top cut / Top 8 / 1.º puesto, chips para quitar líneas, y los meses sin torneos como hueco.
