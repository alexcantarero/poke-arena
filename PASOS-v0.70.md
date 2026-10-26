# Cómo aplicar la v0.70 — app instalable

**Sin migración nueva.** Si vienes de la v0.66 o antes, el SQL de `PASOS-v0.67.md` sigue
siendo obligatorio en producción.

1. Descargas: `pokearena-v0.70-completa.zip` y `aplicar-v0.70.ps1`.
2. `powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\aplicar-v0.70.ps1"`
3. `-SoloSubir`.
4. Pruébalo:
   - **Android (Chrome)**: Ajustes → Este dispositivo → «Instalar PokéArena». Abre la app desde
     el icono: pantalla de bienvenida azul y, al mantener pulsado el icono, los atajos.
   - **iPhone (Safari)**: Ajustes → Este dispositivo enseña los tres pasos.
   - **Si ya la tenías instalada**: el icono viejo puede tardar en cambiar. Desinstálala y
     vuelve a instalarla para ver el icono y la bienvenida nuevos.
   - `https://poke-arena-sand.vercel.app/.well-known/assetlinks.json` responde `[]` (normal
     hasta que generes la app de Android).
5. La app de Android, cuando quieras: `docs/11-app-android.md`.
