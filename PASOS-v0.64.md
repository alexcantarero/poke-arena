# Cómo aplicar la v0.64 — un zip y un comando

**Sin migración.** El zip lleva **también la v0.63**: sirve igual si vienes de la v0.62 (no
llegaste a aplicar la 0.63) que si ya la tienes.

1. Pon en Descargas `pokearena-v0.64-completa.zip` (sin descomprimir) y `aplicar-v0.64.ps1`.
2. En la terminal de VS Code, en la carpeta del proyecto:

   ```powershell
   powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\aplicar-v0.64.ps1"
   ```

3. Míralo con `npm run dev`:
   - **El menú**: Chansey en Inicio, el Mapa en Calendario, la Master Ball en Ranking… en la
     barra lateral, en la de abajo del móvil y en «Más». La sección activa sale a color y
     algo más grande; las demás, apagadas.
   - Si algún sprite sale como el icono de línea de siempre, es que PokéAPI no tiene ese
     objeto con ese nombre: dime cuál y lo cambio por otro (es una línea en `src/lib/nav.ts`).
   - **Una ronda de torneo**: la Ball de la cinta cambia según sea Challenge, Cup o Regional.
   - Lo de la v0.63 (ver `PASOS-v0.63.md`), si no lo habías probado.
4. Súbelo: el mismo comando con `-SoloSubir` al final.

## Deshacer

`git revert HEAD`. No toca la base de datos.
