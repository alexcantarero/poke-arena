# Implementar la v0.13.0

**Sin migración de base de datos y sin dependencias nuevas.** Va encima de lo que había en
`2809.zip` (el repo del 28/09, que `package.json` todavía marcaba como 0.12.0).

## 1. Copiar los ficheros

Descomprime `arena-v0.13.0-cambios.zip` en la raíz del repo y acepta reemplazar. Son 21:

**Nuevos (3)**
- `src/components/UltimoRegional.tsx` — el panel del inicio.
- `IMPLEMENTAR-v0.13.0.md` y `GUIA-MEJORAS.md` — este documento y la guía de lo que queda.

**Modificados**
- `src/app/(app)/page.tsx` — inicio con el panel y el selector Global / Vuestro grupo.
- `src/app/(app)/torneos/[id]/page.tsx` — sin «Resultados del grupo»; tope de rondas.
- `src/components/RondasDelGrupo.tsx` — cabeceras con puesto, V–D–E, sprites, avatar, CP y
  comentario; etiqueta de fase por ronda.
- `src/components/CaminoAlCorte.tsx` — «Tu Challenge» sin corte; sin Día 2 fuera de Regionales.
- `src/components/TournamentRounds.tsx` — `RoundForm` acepta `maxRound`.
- `src/actions/index.ts` — `saveTournamentRound` rechaza rondas por encima del tope.
- `src/lib/estructura.ts`, `src/lib/metaIrl.ts`, `src/lib/stats.ts`, `src/lib/cut.ts`,
  `src/lib/cp.ts`.
- `tests/estructura.test.ts`, `tests/metaIrl.test.ts`, `tests/cp.test.ts`,
  `tests/cut.test.ts`, `tests/v0_5_0.test.ts`.
- `package.json` (versión), `CHANGELOG.md`.

No hay nada que borrar a mano.

## 2. Comprobar

```bash
npm test          # 250 de 250
npm run build     # nunca se ha podido lanzar desde el entorno de Claude: hazlo antes de subir
```

Si el build se queja de algo en los ficheros de arriba, es lo primero que hay que mirar: el
chequeo de tipos se hizo con las librerías como `any`.

## 3. Probar en la app

1. **Challenge de 5 rondas con las 5 apuntadas** (el «Hide 'n Sneak»): ya no sale el
   formulario, el texto dice que no hay top cut y «Camino al corte» es «Tu Challenge» sin
   mensaje en rojo. Ninguna ronda lleva «Día 2».
2. **Una Cup**: tras el suizo deja seguir con las rondas del corte, que salen como Cuartos,
   Semifinal, Final. No aparece «Día 2» en ningún sitio.
3. **El Regional de 3.342**: las rondas 9–14 llevan «Día 2». La lista de debajo ya no existe:
   cada cabecera dice «410 de 3342», 7–6–1, Slowking/Drapion, 45 CP y tu comentario.
4. **Inicio**: el bloque «El último Regional» aparece tras las cifras.
   - **Global** necesita al menos un Regional importado en Ajustes → Metagame presencial.
     Sin él, el bloque explica cómo importarlo.
   - **Vuestro grupo** usa el último Regional con resultados apuntados.

## 4. Lo que conviene saber

- **La conversión «Global» es al top cut dentro de lo importado**, no a Día 2. Lo importado
  es un top 32/64, y en esa muestra todo el mundo pasó al Día 2. La cabecera dice la muestra.
- **Sobrejugado** compara contra el meta **online** de Limitless (14 días). Si Limitless tarda
  más de 2,5 s, la tarjeta lo dice y el inicio no espera.
- El inicio carga ahora también el metagame importado (`loadMetaIrl`). Con pocos eventos no se
  nota; ver el punto de rendimiento en `GUIA-MEJORAS.md`.
