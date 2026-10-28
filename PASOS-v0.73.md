# Cómo aplicar la v0.73

**Sin migración.** Lleva dentro la v0.71 y la v0.72: con esta basta, vengas de la v0.70 o de
cualquiera de las dos. Qué probar de aquellas: `PASOS-v0.71.md` y `PASOS-v0.72.md`.

1. Descomprime el paquete en Descargas: sueltos `pokearena-v0.73-completa.zip` (sin
   descomprimir) y `aplicar-v0.73.ps1`.
2. `powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\aplicar-v0.73.ps1"`
3. Prueba con el Chrome en tamaño móvil:
   - **Inicio**: el selector Elo · CP · Liga cabe y funciona; nada se sale por la derecha.
   - **Barra de abajo**: el acompañante asoma pequeño a la derecha del icono.
   - **Ajustes**: machaca la rueda → Klink, Klang y Klinklang en el centro.
   - **Perfil**: «Camino al Mundial» debajo de los CP.
   - **Tutoriales**: para verlos otra vez sin cuenta nueva, abre una página en incógnito con
     otra cuenta de prueba, o borra tus «tutoriales vistos» en Neon:
     `UPDATE players SET tutoriales_vistos = '' WHERE email = 'tu correo';`
4. `-SoloSubir`.
5. Ya en producción: Ajustes → Importar datos → «Torneos online previstos» para rehacer el
   calendario online con la hora de España y las ediciones publicadas.
