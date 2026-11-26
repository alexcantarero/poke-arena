# IMPLEMENTAR v0.139.0

Sobre la **v0.138.0**. **Sin migración.**

## 1. Aplicar

Descomprime `arena-v0.139.0.zip` en la raíz del repo y doble clic en **`aplicar-v0.139.bat`**.
Si algo falla, mándame `aplicar-v0.139.log`.

## 2. Probar

1. **Herramientas → «¿Qué juego en el próximo torneo?»**, Regional, 2500, «Entrar en el top cut»:
   - las cifras ya no son del 58 %: son por jugador (en un Regional de 2.500, del orden del 0,5 %
     al 1 %) y el «×» compara con el mazo medio (×1,5 = un 50 % más que la media);
   - Grimmsnarl y Mega Greninja ya no deberían estar arriba;
   - con «Ocultar fiabilidad baja» marcado, deben aparecer más mazos, también los recientes con
     cortes en Regionales.
   Mándame una captura del top 7 nuevo.
2. **Mazos → «Versiones y dificultad»**: vota con dos cuentas distintas un mismo mazo; la etiqueta
   cambia a la media. En la ficha de un mazo tuyo (editar), también se vota.
3. **Estadísticas**: con votos, sale «Los mazos más difíciles».

## Deshacer

`git revert` del commit. No hay cambios de base de datos.
