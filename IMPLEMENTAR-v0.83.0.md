# IMPLEMENTAR v0.83.0

**Sin migración.** Lleva dentro la v0.82 (qué probar de aquella: `IMPLEMENTAR-v0.82.0.md`).

1. Descomprime el paquete en Descargas: sueltos `pokearena-v0.83-completa.zip` y `aplicar-v0.83.ps1`.
2. `powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\aplicar-v0.83.ps1"`
3. Crea una competición «Elo libre» de prueba y apunta unas partidas:
   - Todos empiezan en 0; quien pierde en 0 sigue en 0.
   - Hasta la 5.ª partida, «En colocación x/5» sin puesto ni Elo a la vista.
   - Desde la 5.ª, su rango con color (Madera → Lapislázuli). Pasa el ratón: cuánto falta.
4. `-SoloSubir`.

## Deshacer

`git revert HEAD`. No toca la base de datos: el Elo se calcula desde las partidas.
