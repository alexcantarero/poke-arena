# Cómo aplicar la v0.62 — un zip y un comando

Sin migración nueva (lleva dentro las de antes por si alguna faltaba; el script las lanza solas).

1. Pon en Descargas `pokearena-v0.62-completa.zip` (sin descomprimir) y `aplicar-v0.62.ps1`.
2. En la terminal de VS Code, en la carpeta del proyecto:

   ```powershell
   powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\aplicar-v0.62.ps1"
   ```

3. Míralo:
   - **La barra lateral**, en tema claro y en oscuro: más estrecha, clara en claro, y los títulos
     de sección se distinguen.
   - **Registrar partida**: elige una liga en «Contexto y notas» y mira cómo cambia el panel
     (cinta dorada «Liga»); sin liga, «Amistoso» en verde. «Detallar juegos»: el dado de los
     mulligans (toca «+») y las cartas de premio (toca la tercera). Marca una penalización: Psyduck.
   - **Una ronda de torneo**: la cinta de arriba cambia según sea Challenge, Cup, Regional…
4. Súbelo: el mismo comando con `-SoloSubir` al final.
