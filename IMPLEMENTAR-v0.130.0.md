# IMPLEMENTAR v0.130.0

Sobre la **v0.129.0**. **Sin migración.**

## 1. Aplicar

Descomprime `arena-v0.130.0.zip` en la raíz del repo y doble clic en **`aplicar-v0.130.bat`**.
Si algo falla, mándame `aplicar-v0.130.log`.

## 2. Probar

1. **Ranking → Enfrentamientos directos → «Tus rivales»**: una tarjeta por cada jugador del grupo
   contra el que has jugado. Comprueba una marca contra la celda del mapa de enfrentamientos
   (con el filtro del Ranking en «Todo»): deben coincidir.
2. Entra con **otra cuenta**: sus rivales son los suyos, no los tuyos.
3. Perfil de otro jugador → «Tú contra …» lleva a su tarjeta.
4. **Perfil → «Resumen de la temporada»**: los números de arriba cuadran con el perfil (partidas
   de la temporada, CP). Prueba la temporada anterior con el chip de arriba, si hay datos.

## Deshacer

`git revert` del commit. No hay cambios de base de datos.
