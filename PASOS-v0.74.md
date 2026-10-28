# Cómo aplicar la v0.74 — el recomendador

**Sin migración.** Lleva dentro la v0.71, v0.72 y v0.73: con esta basta.

1. Descomprime el paquete en Descargas: sueltos `pokearena-v0.74-completa.zip` y `aplicar-v0.74.ps1`.
2. `powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\aplicar-v0.74.ps1"`
3. Herramientas → Recomendador. Prueba Cup / 48 / «Entrar en el top cut», y luego Regional /
   1500 / «Pasar al Día 2».
4. Para que recomiende mejor, cuantos más datos mejor:
   - Ajustes → Importar datos → **Regionales y City Leagues**: impórtalos (son la base del
     campo de Regionales y de Cups).
   - Apuntad las rondas de vuestros torneos **con el mazo del rival**: es lo único que sabe del
     meta de vuestras tiendas (Challenges y Cups).
   - Las listas de vuestros mazos dan la consistencia teórica; los mulligans que apuntáis, la real.
5. `-SoloSubir`.
