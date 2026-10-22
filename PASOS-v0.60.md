# Cómo aplicar la v0.60 — un zip y un comando

Lleva dentro de la v0.50 a la v0.59. **Lleva migraciones**: la de la v0.59 (comentarios de los
mazos), si no la aplicaste, y la nueva del tutorial. El script las lanza solas contra la base de tu
`.env.local`. Si producción usa otra base, pega en el SQL Editor de Neon de esa rama
`drizzle/0022_v0_59_0.sql` y `drizzle/0023_v0_60_0.sql`: son seguras de repetir.

> ⚠️ **Sin la migración en producción, la app no arranca**: el layout pregunta por el tutorial en
> una columna nueva. Lánzala ANTES de subir.

1. Pon en Descargas `pokearena-v0.60-completa.zip` (sin descomprimir) y `aplicar-v0.60.ps1`.
2. En la terminal de VS Code, en la carpeta del proyecto:

   ```powershell
   powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\aplicar-v0.60.ps1"
   ```

3. Míralo con `npm run dev`:
   - **El tutorial** te sale al entrar (a ti y a todos, una vez). Pasa los pasos: cada uno resalta
     dónde está. Al terminar o saltarlo, no vuelve, ni desde otro dispositivo.
   - **Ranking**: arriba, el líder y el mejor Elo; en la tabla, la «Forma» en colores, el % con
     asterisco si hay menos de 5 partidas, y al pasar el ratón por cada columna, qué significa.
   - **Estadísticas**: el uso y el % de cada mazo ahora son de JUEGOS. Las cifras subirán (un
     Bo3 son hasta tres juegos): es lo esperado.
4. Súbelo: el mismo comando con `-SoloSubir` al final.
