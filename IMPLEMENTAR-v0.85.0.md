# IMPLEMENTAR v0.85.0

**Sin migración.** Lleva dentro de la v0.82 a la v0.84 (sus `IMPLEMENTAR` van en el paquete).

1. Descomprime el paquete en Descargas: sueltos `pokearena-v0.85-completa.zip` y `aplicar-v0.85.ps1`.
2. `powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\aplicar-v0.85.ps1"`
3. Prueba:
   - **Torneos → «Apuntar un resultado de Cup o Challenge»**: apunta 2 o 3 puestos de una Cup.
     Luego Herramientas → Recomendador → League Cup: esos mazos cuentan.
   - **Guarda una partida** y vuelve a Inicio / Resultados: tiene que verse al momento (la caché
     se invalida al guardar). Si algo tarda, como mucho 60 s.
   - **Ajustes → Importar datos → Trainer Hill**: si exportas el CSV de conversión, súbelo como
     «Conversión». Si dice que no lo entiende, pásame el fichero.
   - El recomendador tarda menos la segunda vez que lo abres.
4. `-SoloSubir`.

## Deshacer

`git revert HEAD`. No toca el esquema. Los resultados de Cup apuntados se quedan en
`meta_events`/`meta_entries` (se pueden borrar desde Ajustes → Eventos importados).
