# Cómo aplicar la v0.53 — un zip y un comando

Lleva dentro la v0.52 (que aún no tenías) y sirve estés en la v0.49, la v0.51 o la v0.52.

1. Pon en Descargas `pokearena-v0.53-completa.zip` (sin descomprimir) y `aplicar-v0.53.ps1`.
2. En la terminal de VS Code, en la carpeta del proyecto:

   ```powershell
   powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\aplicar-v0.53.ps1"
   ```

3. Míralo con `npm run dev`, **mejor desde el móvil** (en la misma wifi, abre la dirección
   «Network» que enseña `npm run dev`):
   - **Registrar partida**: el marcador se elige con un toque; «Detallar juegos» abre el juego a
     juego; prueba «Empate por tiempo».
   - **Estadísticas**: el meta online arriba, y los bloques en orden.
   - **Ranking → Camino al Mundial**: la fecha bajo cada puesto.
   - **Ajustes → Diagnóstico de Ciphermaniac**: **mándame una captura de la tabla.**
4. Súbelo: el mismo comando con `-SoloSubir` al final.
