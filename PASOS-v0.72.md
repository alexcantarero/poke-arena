# Cómo aplicar la v0.72

**Sin migración.** Lleva dentro la v0.71 (Herramientas y demás): si no la llegaste a aplicar,
con esta basta. Lo que hay que probar de la v0.71 está en `PASOS-v0.71.md`.

1. Descomprime el paquete en Descargas: sueltos `pokearena-v0.72-completa.zip` (sin
   descomprimir) y `aplicar-v0.72.ps1`.
2. `powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\aplicar-v0.72.ps1"`
3. Míralo con `npm run dev` y el Chrome en tamaño móvil:
   - Barra de abajo y «Más»: iconos de línea, como en PC.
   - Inicio → El último Regional: tarjetas de 2 en 2.
   - Estadísticas → Meta online → «Emparejamientos por mazo»: toca uno.
   - Ajustes: la rueda arriba a la izquierda con la versión. Machácala.
4. `-SoloSubir`. En el móvil, cierra la app del todo y ábrela: Ajustes debe decir v0.72.0.
