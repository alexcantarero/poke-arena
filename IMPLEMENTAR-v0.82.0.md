# IMPLEMENTAR v0.82.0

**Sin migración.** Va encima de la v0.81 (el código que me pasaste, con tus cambios del
recomendador y del Camino al Mundial dentro).

## Pasos

1. Descomprime el paquete en Descargas: sueltos `pokearena-v0.82-completa.zip` y `aplicar-v0.82.ps1`.
2. `powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\aplicar-v0.82.ps1"`
   (verifica, compila y hace el commit; para si algo falla).
3. Prueba en `npm run dev`:
   - **Herramientas → Recomendador**: cambia «Lo que buscas» entre Top cut, Ganar, Día 2 y
     Listas sorpresa: la lista cambia. Pasa el ratón por las cifras. Marca «Ocultar fiabilidad baja».
   - **Liga → Nueva competición → «Elo libre»**: apunta partidas con esa liga elegida y mira la
     clasificación por Elo.
   - **Inicio → Mejores resultados**: tipos en color y CP con medalla.
4. `-SoloSubir`.

## Deshacer

`git revert HEAD` (un solo commit). No toca la base de datos. Una competición «Elo libre»
creada con la v0.82 seguiría existiendo; con la versión anterior se vería como una liga normal.
