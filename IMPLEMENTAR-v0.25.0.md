# PokeArena TCG v0.25.0 — cómo aplicarla

Va sobre la **v0.24.0** (`v0_24_0.zip`). **Lleva migración** (`drizzle/0015_v0_25_0.sql`). Sin
dependencias nuevas. Sin variables de entorno nuevas.

## Pasos

1. Descomprime encima del repo y **borra** `src/components/LogoMark.tsx` y `src/app/icon.svg`
   (vuelve el logo anterior; sin `icon.svg` vuelve a mandar el favicon de `public/`).
2. Lanza `drizzle/0015_v0_25_0.sql` en una **rama de Neon** primero y luego en producción.
3. `npm test` (65 de 65), `npx tsc --noEmit` y `npm run build`. Push.

**Deshacer:** revertir los ficheros y `ALTER TABLE games DROP COLUMN archetype_a_id, DROP COLUMN
archetype_b_id; ALTER TABLE settings DROP COLUMN featured_regional_id;` (columnas nuevas, sin datos
previos).

## Qué trae

| | Cambio | Ficheros |
| --- | --- | --- |
| Fallo | «Vista agrupada» no dejaba volver a «Detallada» y «Regionales → Jugadores de la app» no respondía. **Causa:** la memoria de filtros (v0.21) restauraba lo guardado al llegar a la URL sin parámetros. Ahora solo restaura al entrar desde otra pantalla. | `lib/filtroMemoria.ts` (nuevo), `components/FilterMemory.tsx`, `tests/filtroMemoria.test.ts` |
| UI | Fuera la gráfica de Elo de Liga y Perfil (queda en Ranking). | `competiciones/page.tsx`, `perfil/[id]/page.tsx` |
| UI | Inicio: sin «Registrar partida» arriba; tarjeta 1 «Tus partidas X / total»; tarjeta dorada = tu puesto en la liga y, a su derecha, tu puesto de Elo. Perfil: lo mismo para esa persona (el %V pasa a la nota). Textos en ES/EN. | `page.tsx`, `perfil/[id]/page.tsx`, `lib/data.ts` (`posicionesDe`, `mainCompetition`), `lib/i18n.ts` |
| Logo | Vuelve el logo anterior. | `components/Wordmark.tsx` |
| Liga | **Mazo por juego**: en cada juego se elige el arquetipo de cada lado (opcional; vacío = el de la serie). Un arquetipo con el que alguien ya ganó un juego de la serie no se le ofrece y el servidor lo rechaza en partidas de liga. Perder o empatar no bloquea. Cuenta el arquetipo exacto. La matriz de emparejamientos cuenta juego a juego cuando hay mazos por juego. | `lib/juegosMazos.ts` (nuevo) + test, `MatchForm.tsx`, `actions` (`saveMatch`), `lib/stats.ts` (`matchupMatrix`), `db/schema.ts` |
| Ajustes | **«Último Regional» de Inicio** elegible (Ajustes → Metagame presencial). Vista Global: ese evento; vista Grupo: vuestro torneo de esas fechas. Vacío = automático. | `ajustes`, `page.tsx`, `actions` (`setFeaturedRegional`), `db/schema.ts` |

## No hecho / riesgos

- Las demás estadísticas de arquetipo (uso, %V, conversión) siguen contando la **serie** con su mazo
  principal, como acordamos; solo la matriz va juego a juego.
- El mazo por juego no se ha añadido al formulario de rondas de torneo (`RoundForm`), solo al de
  partidas: era lo pedido para la Liga.
- `npm run build` no se ha podido ejecutar aquí.
