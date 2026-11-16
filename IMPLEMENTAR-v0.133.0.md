# IMPLEMENTAR v0.133.0

Sobre la **v0.132.0** (y esta, sobre la v0.131). **Sin migración.**

## 1. Aplicar

Descomprime `arena-v0.133.0.zip` en la raíz del repo y doble clic en **`aplicar-v0.133.bat`**.
Si algo falla, mándame `aplicar-v0.133.log`.

## 2. Probar

1. **Mazos → «Comparar versiones»** en un grupo con varios mazos (Slowking): cada versión con sus
   usos, su % y, si tiene lista, las cartas que entran (+) y salen (−) respecto a la de
   referencia. Comprueba una diferencia a mano con las dos listas.
2. **Ficha de un torneo sin cerrar → «Calculadora suiza»**: se abre con el tipo, los jugadores y
   tu récord, ya calculada, y con los CP por puesto.
3. **Torneos → «Apuntar resultado local»**: escribe parte del nombre de un mazo, elige la
   sugerencia, pon puesto y récord (5-1-0) y guarda. Si escribes algo que coincide con varios,
   avisa y no guarda.
4. **Ranking**: las dos gráficas (Elo y ladder) en panel oscuro, con la tira de cifras arriba.
   Míralas en el móvil y en tema claro: el panel es oscuro a propósito.
5. **Ficha del torneo**: el camino al corte sale plegado; al abrirlo, se queda abierto.

## Deshacer

`git revert` del commit. No hay cambios de base de datos.
