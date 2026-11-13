# IMPLEMENTAR v0.126.0

Sobre la **v0.125.0** (que va sobre la v0.124 y su migración 0036). **Sin migración.**

## 1. Aplicar (automático, con commit y push)

1. Cierra `npm run dev`.
2. Descomprime `arena-v0.126.0.zip` en la **raíz del repo**.
3. Doble clic en **`aplicar-v0.126.bat`**: copia, verifica (`npm run verificar` + `npm run build`)
   y, si todo pasa, **commit y push**. Si algo falla, mándame `aplicar-v0.126.log`.

Si todavía no has aplicado la v0.124 y la v0.125, aplícalas antes y en orden (cada zip trae su
script). Pruébalo en la preview de Vercel antes de producción: la v0.125 toca el layout, la
acción de guardar ronda y el service worker.

## 2. Probar

1. **Ranking**: quien lleve 3 días o más sin jugar baja de Forma (−15 por cada 3 días). En
   «Evolución del Elo», cada línea llega hasta hoy y baja si no ha jugado; al pasar el dedo por
   el último punto dice «hoy · N días sin jugar» y lo que resta.
2. **Ficha de un torneo en curso**: arriba, el botón amarillo «Apuntar la ronda N».
3. **Modo torneo**: la barra de abajo dice qué falta («Falta: el resultado · el mazo del
   rival»); al elegir las dos cosas se enciende «Guardar la ronda N». Prueba en el móvil que la
   barra queda por encima de la barra inferior y no tapa el último mazo.
4. **Torneos → Nuevo**: ya no está «Pegar del localizador»; sí el campo Dirección.
5. **Calendario → Challenges y Cups de la zona**: pegar el bloque del localizador sigue creando
   los torneos con nombre, tienda, dirección y ciudad.

## Deshacer

`git revert` del commit. No hay cambios de base de datos.
