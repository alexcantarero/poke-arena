# Cómo aplicar la v0.65 — un zip y un comando

**Lleva una migración y es OBLIGATORIA antes de subir**: la app lee la columna nueva
`players.logros` y sin ella no arranca. El script la lanza sola contra la base de tu
`.env.local` (la rama `dev`). **Para producción**, pega `drizzle/0025_v0_65_0.sql` en el SQL
Editor de Neon de la rama `production` **antes** de subir. Es una línea e idempotente:

```sql
ALTER TABLE players ADD COLUMN IF NOT EXISTS logros text NOT NULL DEFAULT '';
```

El zip lleva también la v0.63 y la v0.64: vale vengas de la que vengas desde la v0.62.

1. Pon en Descargas `pokearena-v0.65-completa.zip` (sin descomprimir) y `aplicar-v0.65.ps1`.
2. En la terminal de VS Code, en la carpeta del proyecto:

   ```powershell
   powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\aplicar-v0.65.ps1"
   ```

3. Míralo con `npm run dev`:
   - **La barra**: la de la v0.62, y la Poké Ball en su borde a la altura de «Análisis». Pliega
     y despliega. Cambia el tamaño de la ventana: la Ball sigue a «Análisis».
   - **Secreto**: machaca la Poké Ball (cinco clics rápidos). Luego mira tu perfil.
   - **Perfil**: tu Ball de uso, las etiquetas y los logros encontrados.
   - **Inicio**: el ranking con Elo · CP · Liga.
   - **Una liga**: la clasificación de antes.
   - **Registrar partida → Detallar juegos**: la Poké Ball de los mulligans.
4. Aplica el SQL en producción (arriba) y súbelo: el mismo comando con `-SoloSubir`.

## Deshacer

`git revert HEAD`. La columna `logros` puede quedarse: no molesta a la versión anterior.
