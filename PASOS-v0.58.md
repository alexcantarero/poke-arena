# Cómo aplicar la v0.58 — un zip y un comando

Sin migración nueva. **Respeta los retoques que hicisteis** en `MatchForm.tsx` y en la página de
la liga (letra más pequeña en los nombres y el nombre completo al pasar el ratón): parte de
vuestra versión de esos dos ficheros.

1. Pon en Descargas `pokearena-v0.58-completa.zip` (sin descomprimir) y `aplicar-v0.58.ps1`.
2. En la terminal de VS Code, en la carpeta del proyecto:

   ```powershell
   powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\aplicar-v0.58.ps1"
   ```

3. Míralo con `npm run dev`:
   - **Registrar partida** («+»): la pantalla de enfrentamiento, los botones de Victoria/Derrota.
     Mírala también en **tema claro**.
   - **La partida de Javi contra Jeremías (Jornada 3)**: cada juego enseña ya su propio mazo.
   - **En el PC con pantalla ancha** (a partir de ~1.760 px), los líderes a los lados; cambian
     al cambiar de pestaña. **En el móvil**, el Pokémon que asoma sobre la pestaña activa.
   - **Estadísticas y Top Decks**: «Other» con el Sustituto.
   - **Móvil**: toca la hoja de la estación en la cabecera; el Pokémon sale hacia abajo.
4. Súbelo: el mismo comando con `-SoloSubir` al final.
