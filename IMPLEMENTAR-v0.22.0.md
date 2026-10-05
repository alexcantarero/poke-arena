# PokeArena TCG v0.22.0 — cómo aplicarla

Va sobre la **v0.21.0**. **Sin migración y sin dependencias nuevas.**

1. Descomprime encima del repo.
2. `npm test` (53 de 53) y `npm run build`. Push.
3. En el móvil: **Ajustes → Apariencia → Animaciones**. Si no ves animaciones, pon «Sí».

## Por qué no se veían las animaciones

La v0.21 respetaba «reducir movimiento» del sistema y en ese caso las apagaba TODAS. Muchos
Android lo activan con «Quitar animaciones» o con el ahorro de batería. Ahora hay un ajuste propio:
**Automático** (lo que diga el móvil; Ajustes avisa si tu móvil las está quitando), **Sí** (siempre)
y **No** (nunca). Se guarda en el navegador y se aplica antes de pintar, como el tema.

## Qué trae

- **Front con ideas de Argo CD:** barra lateral y cabecera móvil oscuras en los dos temas (azul
  pizarra, acento turquesa en la sección activa); «tiles» con franja de estado a la izquierda en la
  lista de torneos (turquesa abierto, ámbar borrador, gris cerrado) y en cada partida (verde gana,
  rojo pierde, gris empate); metadatos en pares CLAVE valor en mono.
- **Temporadas:** franja de color animada arriba de la barra lateral y bajo la cabecera móvil,
  emblema de la estación junto a la marca y partículas al fondo (hojas en otoño, nieve en
  invierno, pétalos en primavera, destellos en verano). Fechas señaladas: Halloween (24 oct–1 nov,
  calabazas y murciélagos), Navidad (15 dic–6 ene) y la semana del Mundial (10–20 ago). Los colores
  de datos (victoria, derrota) no cambian con la estación. `src/lib/estacion.ts`.
- **Agrupación automática de arquetipos** por el primer Pokémon: «Dragapult / Dudunsparce»,
  «Dragapult / Blaziken»… → Dragapult. Si existe un arquetipo con ese Pokémon y sin secundario, da
  nombre y sprite a la familia. Lo puesto a mano en Ajustes (p. ej. «Grookey / Applin» → «Festival
  Lead») sigue mandando.
- **Evolución del Elo** como gráfica lineal en el tiempo, con todos en la misma gráfica y selector de
  jugadores (la misma que la del ladder). En el Ranking (tú marcado de inicio) y en cada perfil (el
  dueño del perfil marcado). La fecha de corte del Elo sale como línea roja.

## Ficheros

Nuevos: `src/lib/estacion.ts`, `src/components/SeasonFx.tsx`, `src/components/MotionToggle.tsx`,
`tests/estacion.test.ts`.

Modificados: `package.json`, `src/app/layout.tsx`, `src/app/(app)/layout.tsx`, `src/app/globals.css`,
`ajustes`, `estadisticas`, `perfil/[id]`, `ranking`, `torneos`, `src/components/ui.tsx`,
`statistics/LadderChart.tsx`, `src/lib/arquetipos.ts`, `src/lib/ladderSeries.ts`, `src/lib/data.ts`,
`tests/arquetipos.test.ts`, `tests/ladderSeries.test.ts`.
