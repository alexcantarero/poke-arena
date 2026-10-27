# Cómo aplicar la v0.71 — Herramientas

**Sin migración nueva.** Va encima de la v0.70 (la que tienes subida).

1. Descargas: `pokearena-v0.71-completa.zip` (sin descomprimir) y `aplicar-v0.71.ps1`.
2. `powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\aplicar-v0.71.ps1"`
3. Míralo con `npm run dev`:
   - **Herramientas** (barra lateral, en Análisis; en el móvil, en «Más»):
     - Calculadora suiza: elige «League Cup», 32 jugadores, Calcular. Prueba «Regional» con
       3.000: sale el corte del Día 2 y el top asimétrico. Abajo, mete tu récord.
     - Consistencia: 60 / 12 básicos / 10 salidas / 4 básicas.
     - Premios: 4 copias; luego añade 2 de otra carta.
     - Manos y mulligan: elige un mazo. En la ficha de un mazo, el enlace lleva aquí.
   - **Registrar partida («+»)**: elige a dos que tengan una jornada de liga pendiente. Sale el
     aviso azul; al guardar, te lleva a la liga y la partida ya no está pendiente.
   - **Tres mazos**: en una liga de «hasta 3 mazos», Detallar juegos → el tercer selector de
     mazo se abre entero.
   - **Perfil**: los logros ya no dicen cómo se ganan.
4. `-SoloSubir`.

## Si vuelve a salir «Falta el resultado» con un marcador puesto

Vercel → el proyecto → Logs, y busca `resultadoRapido` o `saveMatch`. Pásame esa línea: dice
qué campos llegaron (sin datos personales).
