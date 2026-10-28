# Cómo aplicar la v0.75 — el recomendador aprende

**Sin migración.** Lleva de la v0.71 a la v0.74: con esta basta.

1. Descomprime el paquete en Descargas: sueltos `pokearena-v0.75-completa.zip` y `aplicar-v0.75.ps1`.
2. `powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\aplicar-v0.75.ps1"`
3. Herramientas → Recomendador:
   - Arriba, el acierto del modelo con vuestras partidas. Si dice que aún no hay, es que
     faltan partidas con los dos mazos apuntados.
   - En cada mazo, «Variante recomendada» y «ver las N».
4. `-SoloSubir`.

**Para que aprenda**: apuntad el mazo de los dos jugadores en cada partida (liga y torneos).
Cada partida así es una prueba del modelo; a partir de 30 ajusta su calibración solo.
