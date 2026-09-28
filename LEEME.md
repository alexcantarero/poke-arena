# Los tres módulos de la v0.13, listos para enchufar

Son ficheros **nuevos**: no tocan nada de lo que ya tienes, así que se pueden copiar tal cual
aunque tu repo vaya por delante. Los tres son puros y sin dependencias —igual que `cut.ts` y
`badges.ts`— para que los tests los carguen directos y para que mañana funcionen también en el
navegador, que es lo que hará falta el día que hagamos lo de offline.

```
src/lib/estructura.ts    tests/estructura.test.ts    19 tests
src/lib/metaBadges.ts    tests/metaBadges.test.ts    19 tests
src/lib/metaGrupo.ts     tests/metaGrupo.test.ts     16 tests
```

`npm test` → **211**.

## Qué hace cada uno

**`estructura.ts`** — la tabla oficial de 2026 por asistencia, y los tres umbrales que se miran
entre ronda y ronda: pasar al Día 2, entrada segura (X-1) y pelear el corte (X-2). Para tu
Regional de 3.342: Día 2 con 16 puntos, entrada segura 13-1 (39 pts), pelea 12-2 (36 pts),
fuera con 35 o menos.

**`metaBadges.ts`** — las cuatro frases que resumen un Regional: qué rindió, qué decepcionó, qué
se sobrejugó y qué copó el corte. La conversión se mide **contra la media del campo**, no contra
cero, y los mínimos de pilotos son asimétricos: 5 para coronar, 15 para llamar «decepción».

**`metaGrupo.ts`** — el adaptador de casa. Convierte vuestros resultados de torneo a la misma
forma que los datos de fuera, que es lo que hace que el selector «Global / Vuestro grupo» sea
cambiar un array y no escribir dos pantallas.

## Lo que hace `metaGrupo` y no es evidente

Vuestros resultados no llevan apuntado si alguien pasó a Día 2: llevan el récord. Pero con la
asistencia del torneo se sabe la estructura, y con la estructura el umbral de puntos. Así que
**el «pasó a Día 2» se deduce** en vez de pediros que lo marquéis a mano en cada resultado.

Y cuando no se puede deducir —sin asistencia apuntada, o un torneo de una sola fase— devuelve
**nulo, no cero**. Un nulo se pinta «—» y se entiende; un cero se lee como «no pasó nadie» y es
mentira. Hay un test para eso.

## Cómo se usan juntos

```ts
// Lo vuestro
const r = resumenGrupo(resultadosDeVuestrosTorneos);
const filas = conCuotaOnline(r.filas, metaOnline);
const insignias = insigniasDe(filas, r.campo);
// y la pantalla enseña `r.resultados` al lado del título:
// «Vuestro grupo · 22 resultados en 3 torneos»

// Lo de fuera: mismas dos líneas, cambiando de dónde salen `filas` y `campo`.
```

El tamaño de la muestra viaja con los datos a propósito. Con seis resultados, un 50% de
conversión no es un dato: son tres personas.
