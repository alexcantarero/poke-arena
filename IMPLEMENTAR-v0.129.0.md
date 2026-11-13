# IMPLEMENTAR v0.129.0

Sobre la **v0.128.0**. **Sin migración.**

## 1. Aplicar

Descomprime `arena-v0.129.0.zip` en la raíz del repo y doble clic en **`aplicar-v0.129.bat`**.
Si algo falla, mándame `aplicar-v0.129.log`.

## 2. Probar

1. **Preparación**: ficha de un torneo que no esté cerrado → «Preparar el torneo». Elige tu mazo
   y pulsa Ver: sale la lista de mazos con su parte del campo, tu % y, si has jugado ese cruce,
   «Tú: 2-1». Cambia de mazo y comprueba que cambian los porcentajes. En un torneo a Bo3 los %
   se alejan más del 50 que en uno a Bo1.
2. Compara dos o tres cruces con **Herramientas** (el recomendador): deben ir en la misma
   dirección, porque usan los mismos datos.
3. **Informe**: en un torneo **cerrado** en el que tengas rondas, la tarjeta «Resumen» enseña el
   Elo; «Ver la imagen» abre el informe con todas las rondas. Mira uno de más de 8 rondas (dos
   columnas) y que los nombres largos de mazo no se salgan.

## Deshacer

`git revert` del commit. No hay cambios de base de datos.
