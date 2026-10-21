# Cómo aplicar la v0.55 — un zip y un comando

Lleva dentro de la v0.50 a la v0.54 (incluida la migración de la v0.54, que el script lanza sola).

1. Pon en Descargas `pokearena-v0.55-completa.zip` (sin descomprimir) y `aplicar-v0.55.ps1`.
2. En la terminal de VS Code, en la carpeta del proyecto:

   ```powershell
   powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\aplicar-v0.55.ps1"
   ```

3. Míralo con `npm run dev`:
   - **Ajustes**: el menú a la izquierda (en el móvil, una tira arriba). «Lo tuyo» primero,
     «Organizar la liga» después. Toca una sección: se abre sola.
   - **Ranking → «Cómo se calcula»**: la página de Reglas, con vuestra puntuación arriba.
   - **Torneos → Nuevo**: «Copiar la estructura de» con los últimos torneos. Elige uno: se rellena
     todo menos la fecha, la asistencia, el enlace y las notas.
4. Súbelo: el mismo comando con `-SoloSubir` al final.
