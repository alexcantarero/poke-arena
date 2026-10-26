# Cómo aplicar la v0.69

**Sin migración nueva.** Si vienes de la v0.66 o antes, el SQL de `PASOS-v0.67.md` sigue
siendo obligatorio en producción.

1. Descargas: `pokearena-v0.69-completa.zip` y `aplicar-v0.69.ps1`.
2. `powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\aplicar-v0.69.ps1"`
3. `-SoloSubir`.
4. En el móvil, **esta primera vez** cierra la app del todo (deslizarla fuera en la multitarea)
   y ábrela. Mira «Más» → abajo sale «PokeArena v0.69.0 · Producción». A partir de aquí, cada
   versión nueva avisará sola.
5. Prueba el aviso: deja la app abierta en el móvil, sube cualquier cambio, espera a que Vercel
   termine y vuelve a la app. Debe salir «Hay una versión nueva».
