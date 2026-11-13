# IMPLEMENTAR v0.127.0

Sobre la **v0.126.0**. **Sin migración.**

## 1. Aplicar

1. Cierra `npm run dev`.
2. Descomprime `arena-v0.127.0.zip` en la **raíz del repo**.
3. Doble clic en **`aplicar-v0.127.bat`**: copia, verifica, hace el build y, si todo pasa,
   **commit y push**. Si algo falla, mándame `aplicar-v0.127.log`.

## 2. Traer las rondas

1. Antes, **Ajustes → Actualizar catálogo** de arquetipos: un mazo rival que no esté en el
   catálogo se guarda sin arquetipo (su nombre queda en la nota de la ronda).
2. **Ajustes → traer torneos de Limitless**, con 30 días. El aviso dice cuántas rondas nuevas han
   entrado y cuántas sin mazo rival identificado.
3. Repite el botón hasta que diga «0 ronda(s) nueva(s)»: cada pasada completa además hasta 25
   torneos antiguos que no tenían rondas. El cron diario hace lo mismo, de 10 en 10.

## 3. Probar

1. Abre un torneo online importado: cada jugador del grupo tiene sus rondas, con V/D/E y el
   mazo del rival; el rival sale como «Rival R3» (o con su nombre si es del grupo).
2. **Compara un torneo con su página de Limitless**: el número de rondas, los resultados y los
   mazos rivales deben coincidir, también en el top cut si lo hubo. Si algo no cuadra, dime qué
   torneo es.
3. El récord del resultado (V-D-E) no cambia: sigue siendo el de la clasificación.
4. **Estadísticas → matriz de emparejamientos** y el perfil: aparecen las partidas online. El Elo
   de quien haya jugado online se mueve.
5. Una ronda que ya estaba apuntada a mano en un torneo online sigue como estaba.

## Deshacer

`git revert` del commit. Las rondas importadas llevan «Importado de Limitless» en la nota, por si
hubiera que localizarlas.
