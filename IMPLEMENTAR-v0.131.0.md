# IMPLEMENTAR v0.131.0

Sobre la **v0.130.0**. **Sin migración.**

## 1. Aplicar

Descomprime `arena-v0.131.0.zip` en la raíz del repo y doble clic en **`aplicar-v0.131.bat`**.
Si algo falla, mándame `aplicar-v0.131.log`.

## 2. Probar

1. **Campana**: arriba (móvil) o en el menú lateral, con un número si tienes algo pendiente.
   Abre `/avisos`: cada aviso lleva a donde se resuelve. Actualiza el ladder y vuelve: ese aviso
   ya no está y el número baja.
2. **«Iré» sin resultado**: marca «Iré» en un torneo de ayer en el que no tengas resultado;
   debe salir en Avisos. Apunta el resultado: desaparece.
3. **Ladder y Forma**: pon un rango de 1600 o más en tu perfil. En Ranking, tu Forma sube 25
   (40 con 1700, etc.). Quítalo: vuelve a bajar.
4. **CP por puesto**: ficha de una Cup o Challenge sin cerrar con la asistencia puesta. Con 24
   en una Cup: «Se puntúa hasta el 8.º. Faltan 24 jugadores para que el 9–16.º dé 20 CP».
5. **Añadir participante** (organizador, en un torneo): escribe las primeras letras del nombre,
   elige la sugerencia y pulsa el botón; se abre su bloque.
6. **Ranking → Camino al Mundial**: columna CP junto a los puestos. En el móvil, comprueba que
   la fila no se desborda.

## Deshacer

`git revert` del commit. No hay cambios de base de datos.
