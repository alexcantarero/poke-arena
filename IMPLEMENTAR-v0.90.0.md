# IMPLEMENTAR v0.90.0

**Sin migración.** Lleva dentro de la v0.82 a la v0.89 (sus `IMPLEMENTAR` van en el paquete).

1. Descomprime el paquete en Descargas: sueltos `pokearena-v0.90-completa.zip` y `aplicar-v0.90.ps1`.
2. `powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\aplicar-v0.90.ps1"`
   (`next/og` viene con Next: no hay dependencias nuevas).
3. Prueba:
   - **Ronda de torneo**: elige el mazo del rival → «Según el meta, ganas este cruce el X %».
   - **Torneo cerrado** en el que jugaste: «Tu torneo» con récord, CP y cruces → «Compartir»
     desde el móvil (sale el menú con la imagen) y «Ver la imagen».
   - **Easter eggs**: una URL inventada (`/xyz`) → MissingNo.; tu perfil con `?variocolor=1` →
     shiny; mantener pulsado tu avatar en el panel VS → Ditto; ↑↑↓↓←→←→BA en el ordenador → Mew;
     tema/idioma 8 veces → Eevee. Snorlax solo de 3 a 5 de la madrugada; Salpicadura con 5
     derrotas seguidas. Cada uno da su logro (Perfil → Logros).
   - **Recomendador**: «¿Por qué este puesto?» y la variante en el título.
   - **Liga Elo libre**: la mini gráfica (en pantallas medianas y grandes).
   - **Calendario**: ★ en los tipos con huecos libres de CP.
4. `-SoloSubir`.

## Correcciones de compilación

Se incluye el formulario de eventos del calendario y se corrigen los valores nulos de temporada
en la ficha y la imagen resumen del torneo. No requiere migración.

## Deshacer

`git revert HEAD`. No toca el esquema. Los logros ganados se quedan (son texto en `players.logros`).
