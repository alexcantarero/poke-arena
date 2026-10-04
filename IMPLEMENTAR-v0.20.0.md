# PokeArena TCG v0.20.0 — rendimiento, móvil y gráficas

Va sobre la **v0.19.0**. 11 ficheros. **Sin migración y sin dependencias nuevas**
(`next/font` y `next/dynamic` vienen con Next).

## Pasos

1. Descomprime encima del repo.
2. `npm test` y `npm run build`. El primer build descarga las tipografías de Google para
   guardarlas en el proyecto: Vercel lo hace solo.
3. Push.

## Rendimiento (punto 3)

- **La base de datos se cargaba dos veces por pantalla.** El layout y la página llamaban cada uno
  a `loadSnapshot()` y a `currentPlayer()`. Ahora van envueltas en `cache()` de React: una carga
  por petición. Sin riesgo de datos viejos: la caché dura lo que dura la petición.
- **Un viaje a la base en vez de tres en cadena** dentro de `loadSnapshot` (favoritos, juegos y
  resultados se piden a la vez que lo demás, sin el `IN (…)` con todos los ids). En Neon cada viaje
  son decenas de milisegundos, más si la base estaba dormida.
- **Tipografías con `next/font`**: antes una hoja de Google Fonts bloqueaba el primer pintado. Ahora
  se sirven desde vuestro dominio, sin bloqueo y sin salto de letra.
- **Recharts bajo demanda** (`components/statistics/lazy.tsx`): la gráfica del ladder y la de
  conversión cargan su código después de pintar la página, con un hueco de su tamaño mientras.
- **Resultados de 40 en 40** con «Ver más»: con 180 partidas eran más de 700 sprites de golpe.
- Sprites con `decoding="async"` y tamaño declarado, y conexión adelantada al CDN de sprites.
- El Ranking pide los datos de la gráfica del ladder a la vez que el resto, no después.

## Móvil (punto 1)

- Margen lateral de 12 px por debajo de 400 px (antes 16): más ancho útil en móviles de 360 px.
- Las cabeceras de tarjeta bajan los controles (orden, pestañas) a otra línea si no caben, en vez
  de aplastar el título o salirse.
- Sin recuadro gris al tocar y sin retardo de doble toque en botones y enlaces.

## Gráficas (punto 2)

- Fuera «Victorias por arquetipo» de Estadísticas: repetía las barras de «Rendimiento» (mismos
  mazos, mismo %V, mismo mínimo de 2 usos) y obligaba a cargar Recharts entero en esa página.

## Verificación

- Tests: 37 de 37. `tsc` contra la v0.19: sin errores nuevos reales.
- `npm run build` no se puede lanzar aquí.
