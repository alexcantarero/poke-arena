# PokeArena TCG v0.19.0 — cómo aplicarla

Va sobre tu **v0.18.1** (`PokeArenaCodeV18_1.zip`: incluye tus cambios del pegado de eventos por
WhatsApp, que se conservan). **Lleva migración y un cron. Sin dependencias nuevas.**

## Pasos

1. Descomprime encima del repo.
2. **`vercel.json`**: si ya tienes uno en la raíz, no lo pises: añade solo el bloque `crons`.
3. **Variable de entorno en Vercel**: Project Settings → Environment Variables → `CRON_SECRET` con
   un valor largo y aleatorio (p. ej. `openssl rand -hex 32`). Vercel la manda sola al llamar al
   cron. Sin ella el endpoint responde 401 y no borra nada (a propósito).
4. Lanza `drizzle/0012_v0_19_0.sql` en el SQL Editor de Neon (o `npm run db:push` para la tabla
   y luego el SQL igualmente: la fusión de amistosos es un UPDATE/DELETE que `db:push` no hace).
5. `npm test` y `npm run build`. Push.
6. Opcional: borra `src/components/LadderTimeline.tsx` (la v0.18 lo usaba; ya no lo usa nadie).

## Qué cambia, punto por punto

### 1. Interfaz
- **Cabecera:** debajo de «PokeArena TCG» sale solo la temporada («SEASON 1»). `src/lib/marca.ts`
  quita «PokeArena» del nombre de la liga, sin tocar el ajuste guardado.
- **Liga con estadísticas:** `LigaStats` en la lista de Liga (todas las competiciones) y en la
  ficha de cada una: partidas, jugadores, empates, «gana quien empieza», victorias por jugador
  (barra V/E/D) y partidas por mes. Barras de CSS pintadas en el servidor.

### 2. Gráfica del ladder (Ranking → Ladder)
- **Un punto por cada inserción**, con fechas reales en el eje X y curva suave (`LadderChart`).
- **Filtro por jugador:** chips para elegir a quién se ve; por defecto los 5 con más rango.
- **Resets en rojo:** línea vertical en cada reset de temporada; la línea de cada jugador se corta
  ahí. Tabla nueva `season_resets` (se rellena con el último reset que ya había) y el botón de
  reset de Ajustes la alimenta.

### 3. Ranking
- **Filtros en desplegables** que se aplican solos al cambiar: Partidas · Tipo de torneo (o
  Competición si miras Liga) · Dónde · Fechas (temporada, 30 días, 90 días, este año, entre dos
  fechas) · A quién. Las URLs antiguas (`temporada=1`, `ambito=online`) siguen funcionando.
- **Sin etiqueta «DROP»** en las tablas del Ranking (sigue en la ficha del torneo).

### 4. Amistosos unificados
- Una sola categoría **«Amistoso»** = partida sin competición. El selector de partida ya no ofrece
  competiciones de tipo «Amistosos» y ese tipo desaparece al crear competiciones.
- La migración pasa las partidas de esas competiciones a amistoso y borra las competiciones.
  **Aviso:** con el Elo en «liga y torneos», esas partidas contaban por estar en una competición;
  ahora no. El Elo de algunos puede moverse un poco.

### 5. Limpieza automática
- **Cron diario a las 4:00 UTC** (`/api/cron/limpieza`, plan Hobby: un cron al día).
- Borra torneos creados hace **más de 3 días sin ninguna participación** (ni resultado ni ronda).
- **Excepción:** un torneo cuya fecha aún no ha llegado no se borra hasta 3 días después de esa
  fecha. Si no, un Regional apuntado con un mes de antelación desaparecería a los 3 días. Para la
  regla literal, `respetarFuturos: false` en `src/lib/limpieza.ts`.
- Botón **«Limpiar ahora»** en Ajustes para organizadores.

## Verificación hecha aquí

- Tests: 37 de 37 (17 nuevos: filtros del ranking, series del ladder, limpieza, subtítulo).
- `tsc` estricto sin `node_modules` comparado con tu v0.18.1: ningún error nuevo real.
- `npm run build`: no se puede lanzar en este entorno.
