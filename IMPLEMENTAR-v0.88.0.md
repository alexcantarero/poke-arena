# IMPLEMENTAR v0.88.0

**Sin migración.** Lleva dentro de la v0.82 a la v0.87 (sus `IMPLEMENTAR` van en el paquete).

1. Descomprime el paquete en Descargas: sueltos `pokearena-v0.88-completa.zip` y `aplicar-v0.88.ps1`.
2. `powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\aplicar-v0.88.ps1"`
3. Prueba:
   - **Torneos**: los online previstos para otro día salen «Próximo», no «En curso». El filtro
     de estado tiene «Próximo».
   - **Una ronda**: sin resultado o sin mazo del rival, el botón de guardar está apagado y dice
     qué falta. Deja el nombre del rival vacío y guarda: aparece «NPC 1» (o el número de ronda).
4. `-SoloSubir`.

## Deshacer

`git revert HEAD`. No toca la base de datos.
