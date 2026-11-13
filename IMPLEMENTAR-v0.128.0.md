# IMPLEMENTAR v0.128.0

Sobre la **v0.127.0**. **Sin migración.**

## 1. Aplicar

1. Cierra `npm run dev`.
2. Descomprime `arena-v0.128.0.zip` en la **raíz del repo**.
3. Doble clic en **`aplicar-v0.128.bat`**. Si algo falla, mándame `aplicar-v0.128.log`.

## 2. Probar (en el móvil, en un torneo en curso → modo torneo)

1. **Sin detalle**: resultado + mazo del rival + Guardar. Igual que antes.
2. **Bo1 con detalle**: pulsa «Añadir premios y mulligans», marca 6 y 4 premios y un mulligan,
   guarda. En la ficha del torneo, la ronda sale con sus premios y mulligans.
3. **Bo3 con detalle** (un torneo con rondas a Bo3, o el top cut): «Apuntar juego a juego»,
   Juego 1 «Lo gané», ＋ Juego 2 «Lo perdí», ＋ Juego 3 «Lo gané»: el resultado de arriba pasa
   solo a Victoria. Prueba un 2-0 con un tercer juego: la barra avisa de que sobra.
4. **Etiquetas**: con Derrota o Empate aparece «¿Por qué perdiste?»; marca dos, guarda, y
   compruébalas en la ficha de la ronda y en Estadísticas.
5. **Corregir** una ronda con detalle: se abre con todo puesto; cambia un premio y guarda.
6. **Sin red** (modo avión): guarda una ronda con detalle; al volver la red sube con todo.

## Deshacer

`git revert` del commit. No hay cambios de base de datos.
