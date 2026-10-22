# Cómo aplicar la v0.66

Igual que la v0.65 (el zip la lleva dentro, y también la v0.63 y la v0.64).

**Si todavía no aplicaste la v0.65: su migración sigue siendo obligatoria.** Antes de subir,
en el SQL Editor de Neon de la rama `production`:

```sql
ALTER TABLE players ADD COLUMN IF NOT EXISTS logros text NOT NULL DEFAULT '';
```

1. Descargas: `pokearena-v0.66-completa.zip` y `aplicar-v0.66.ps1`.
2. `powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\aplicar-v0.66.ps1"`
3. Míralo con `npm run dev`:
   - Haz la ventana del navegador baja (unos 600–700 px de alto): la barra lateral cabe entera.
   - En tema claro, «SEASON 1» y «otoño» de la barra se leen mejor.
   - Ligas: la columna PJ junto al %V.
   - Lo de la v0.65 (ver `PASOS-v0.65.md`) si no lo habías probado.
4. `-SoloSubir`.
