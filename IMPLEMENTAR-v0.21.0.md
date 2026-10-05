# PokeArena TCG v0.21.0 — cómo aplicarla

Va sobre la **v0.20.0** (`PokeArenaV20.zip`, idéntico a la entregada). **Lleva migración**
(`drizzle/0013_v0_21_0.sql`). Sin dependencias nuevas.

## Pasos

1. Descomprime encima del repo.
2. Lanza `drizzle/0013_v0_21_0.sql` en el SQL Editor de Neon (o `npm run db:push`). Idempotente.
3. `npm test` y `npm run build`. Push.
4. En Ajustes → «Familias de arquetipos», agrupa las variantes (p. ej. «Grookey / Applin» →
   «Festival Lead»). Sin esto, la vista agrupada de Estadísticas no aparece.

**Aviso:** el Elo de todos va a cambiar al desplegar (ver punto 4). Es lo esperado.

## Del prompt, qué ya estaba hecho

Ya entregado en v0.18–v0.20 y no se ha vuelto a tocar: desbordamiento de la Liga en móvil,
puestos centrados, nombres clicables en resultados del torneo, «Nueva/Editar competición»
plegadas, bloqueo de traducción automática, iconos de «Comparar», emblemas de Challenge / Cup /
Online, mazo de liga bloqueado y privado, gráfico del líder, botón de reset de temporada, escala
Novato / salto Arceus / Hierro → Challenger, y la primera ronda de rendimiento.

## Qué trae

### 1. Línea visual y microinteracciones
- **Estilo «herramienta profesional» (Argo CD):** tarjetas con esquina de 8 px, borde fino y casi
  sin sombra; grises fríos y neutros en el tema claro; tablas con cabecera gris suave, más aire y
  la fila resaltada al pasar; etiquetas de estado sobrias con punto de color («● Cerrado»).
- **Transiciones:** fundido corto al cambiar de pantalla o de pestaña (`app/(app)/template.tsx`),
  los plegables abren con fundido, los botones se hunden suavemente al pulsar y tienen anillo de
  foco con teclado. Todo se apaga con «reducir movimiento» del sistema.
- **Filtros persistentes:** Ranking, Estadísticas y Resultados recuerdan el último filtro (en el
  navegador) hasta que se pulsa «Quitar filtros». La URL sigue mandando: un enlace compartido
  enseña sus filtros, no los tuyos.

### 3. Torneos
- **Interruptor «Top cut»** al crear o editar un torneo (en «Más detalles»). Apagado: se guarda 0,
  desaparece el tamaño, y la ficha deja de ofrecer rondas de eliminatoria al acabar el suizo (lo de
  tu captura: «Si pasaste al top cut, sigue con la ronda 7»).
- **Corregir el arquetipo de alguien:** en «Gestionar a X», el organizador ve abierto «Corregir el
  arquetipo (manda sobre el del mazo)». Lo que se elige ahí es lo que cuentan las estadísticas.

### 4. Elo multievento
Antes solo movían el Elo las partidas entre dos del grupo: las rondas de torneo no contaban y casi
todo el mundo seguía en 1000 (por eso «Evolución del Elo: sin datos suficientes»). Ahora:
- Cuentan liga, amistosos (según el ajuste) y **rondas de torneo**.
- **Peso por evento** (multiplica la K): Liga 1 · Challenge 1 · Cup 1,25 · Regional y Special 1,5 ·
  Internacional 1,75 · Mundial 2 · Online y tienda 0,75 · Amistoso 0,5. En `ELO_PESOS`
  (`src/lib/stats.ts`): cambiar un número es todo.
- Rival de fuera = rival de referencia con el Elo inicial (1000). Rival del grupo = su Elo real.
  En las rondas solo se mueve quien la apuntó (el rival apunta la suya: si no, contaría doble).
- Byes y rondas sin resultado no cuentan. La liga interna sigue siendo suma cero.

### 5. Familias de arquetipos
- `archetypes.parent_id` (padre → variantes), con protección contra ciclos.
- **Ajustes → Familias de arquetipos:** solo salen los arquetipos que se usan en la liga.
- **Estadísticas → «Vista detallada / Vista agrupada»:** suma usos, victorias y entradas de la
  familia y recalcula %V, %Cut, %T8 y %T4 con los totales (no promedia porcentajes). Afecta a «Uso
  del metagame», «Rendimiento» y «Qué mazos llegan al corte». La matriz de emparejamientos sigue en
  detalle.

## Ficheros

Nuevos: `drizzle/0013_v0_21_0.sql`, `src/app/(app)/template.tsx`, `src/components/FilterMemory.tsx`,
`src/lib/arquetipos.ts`, `tests/arquetipos.test.ts`, `tests/eloMulti.test.ts`.

Modificados: `package.json`, `src/actions/index.ts` (saveArchetypeParents), `src/db/schema.ts`,
`src/lib/data.ts`, `src/lib/stats.ts`, `src/app/globals.css`, `(app)/layout.tsx`, `ajustes`,
`estadisticas`, `ranking`, `resultados`, `torneos`, `torneos/[id]`, `FilterPanel.tsx`,
`TournamentForm.tsx`, `TournamentResultForm.tsx`, `TournamentLifecycle.tsx`, `CaminoAlCorte.tsx`.

## Verificación

- Tests: 46 de 46 (9 nuevos: Elo multievento y familias de arquetipos).
- `tsc` estricto contra la v0.20: sin errores nuevos reales.
- `npm run build`: no se puede lanzar en este entorno.
