# Cómo aplicar la v0.80

**Sin migración nueva.** Si en producción aún no está la de la v0.79 (`matchup_imports`),
pega antes su SQL (`PASOS-v0.79.md`). El paquete lleva también de la v0.76 a la v0.79.

1. Descomprime el paquete en Descargas: sueltos `pokearena-v0.80-completa.zip` y `aplicar-v0.80.ps1`.
2. `powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\aplicar-v0.80.ps1"`
3. Prueba:
   - **Herramientas → Recomendador**, Regional + «Ganar el torneo»: lo que gana Regionales y su
     counter, más arriba; números redondos; Basic Box con imagen.
   - **Perfil → Camino al Mundial**: el % junto a «Fácil / Medio / Difícil» y el bloque «Lo mínimo».
   - **Estadísticas**: «Meta online» en la pestaña Online; «Qué mazos llegan al corte», 3 + «Ver más».
4. `-SoloSubir`.
