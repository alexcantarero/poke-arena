# Cómo aplicar la v0.57 — un zip y un comando

Lleva dentro de la v0.50 a la v0.56. **Lleva una migración nueva** (formato del top cut) y el
script la lanza sola contra la base de tu `.env.local`. Si producción usa otra base, pega
`drizzle/0020_v0_54_0.sql` y `drizzle/0021_v0_57_0.sql` en el SQL Editor de Neon de esa rama: son
seguras de repetir.

1. Pon en Descargas `pokearena-v0.57-completa.zip` (sin descomprimir) y `aplicar-v0.57.ps1`.
2. En la terminal de VS Code, en la carpeta del proyecto:

   ```powershell
   powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\aplicar-v0.57.ps1"
   ```

3. Míralo con `npm run dev`:
   - **Edita un torneo** con top cut → «Formato del top cut»: pon el suizo a Bo1 y el corte a Bo3.
   - **Apunta una ronda del suizo**: salen los marcadores de Bo1. **Una del corte**: los de Bo3.
   - **Apunta una ronda sin resultado** (la ronda abierta, antes de jugar). En la lista de rondas
     salen los marcadores en la propia fila: toca uno y queda guardada, con el récord al día.
4. Súbelo: el mismo comando con `-SoloSubir` al final.
