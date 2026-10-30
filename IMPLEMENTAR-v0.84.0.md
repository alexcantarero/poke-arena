# IMPLEMENTAR v0.84.0

**Sin migración.** Lleva dentro la v0.82 y la v0.83 (sus `IMPLEMENTAR` van en el paquete).

1. Descomprime el paquete en Descargas: sueltos `pokearena-v0.84-completa.zip` y `aplicar-v0.84.ps1`.
2. `powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\aplicar-v0.84.ps1"`
3. Herramientas → Recomendador:
   - **Regional + «Pasar al Día 2»**: si Ciphermaniac responde, cada mazo dice «Día 2: x/y».
     Si sale el aviso de «solo el modelo», mira Ajustes → Diagnóstico de Ciphermaniac.
   - **«Listas sorpresa»**: etiquetas «Pocas listas» y «Contra pronóstico».
   - Escribe en «Jugadores»: ya no se recalcula con cada tecla.
4. `-SoloSubir`.

## Deshacer

`git revert HEAD`. No toca la base de datos.
