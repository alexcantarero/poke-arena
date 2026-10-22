# Cómo aplicar la v0.61 — un zip y un comando

**Lleva una migración** (los tutoriales de cada página) y, como la de la v0.60, **es obligatoria
antes de subir**: el layout lee una columna nueva y sin ella la app no arranca. El script la lanza
sola contra la base de tu `.env.local`. Si producción usa otra base, pega
`drizzle/0024_v0_61_0.sql` en el SQL Editor de Neon de esa rama **antes** de subir.

1. Pon en Descargas `pokearena-v0.61-completa.zip` (sin descomprimir) y `aplicar-v0.61.ps1`.
2. En la terminal de VS Code, en la carpeta del proyecto:

   ```powershell
   powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\aplicar-v0.61.ps1"
   ```

3. Míralo:
   - **Ranking** (la vista que se abre): arriba el líder y el mejor Elo; en la tabla, la Forma,
     el récord en una línea y el asterisco con menos de 5 partidas; debajo, la leyenda. En el
     móvil, el % en cifra.
   - **Los tutoriales de página**: entra en Ranking, Estadísticas, Torneos… La primera vez, cada
     una te enseña su tarjeta. Al cerrarla, no vuelve (tampoco desde otro dispositivo).
   - **`/perfil`** te lleva a tu perfil. **«Other»**, con el Sustituto a buen tamaño.
4. Súbelo: el mismo comando con `-SoloSubir` al final.
