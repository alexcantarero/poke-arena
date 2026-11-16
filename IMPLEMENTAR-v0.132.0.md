# IMPLEMENTAR v0.132.0

Sobre la **v0.131.0**. **Sin migración.**

## 1. Aplicar

Descomprime `arena-v0.132.0.zip` en la raíz del repo y doble clic en **`aplicar-v0.132.bat`**.
Si algo falla, mándame `aplicar-v0.132.log`.

## 2. Traer las rondas que faltan

1. **Ajustes → Actualizar catálogo** de arquetipos (un mazo rival fuera del catálogo se guarda
   sin arquetipo).
2. **Ajustes → «Completar rondas de torneos online»**. El aviso dice cuántos torneos ha revisado,
   cuántas rondas han entrado y cuántos quedan. Repite hasta que queden 0 (o hasta que el número
   deje de bajar: los que quedan son torneos de los que Limitless no tiene emparejamientos).
3. O ve a un torneo online concreto (por ejemplo, el de Rol) y pulsa **«Traer las rondas de
   Limitless»**.

## 3. Probar

1. Un torneo online: cada jugador del grupo con sus rondas, V/D/E y mazo rival. Compara uno con
   su página de Limitless, mejor uno con top cut.
2. **Inicio → El último Regional**: si algún mazo raro llegó al corte, quinta tarjeta «Sorpresa».
3. **Mazos**: cabeceras por arquetipo principal, con sus versiones debajo. Busca «slowking».
4. **Ranking → gráfica del ladder**: las etiquetas del final no se pisan.

## Deshacer

`git revert` del commit. No hay cambios de base de datos.
