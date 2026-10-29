# Cómo aplicar la v0.78

**Sin migración.** Lleva dentro la v0.76 y la v0.77: con esta basta (qué probar de aquellas:
`PASOS-v0.76.md` y `PASOS-v0.77.md`).

1. Descomprime el paquete en Descargas: sueltos `pokearena-v0.78-completa.zip` y `aplicar-v0.78.ps1`.
2. `powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\aplicar-v0.78.ps1"`
3. Ajustes → Importar datos → **Torneos online previstos** (o espera: se hace solo al abrir
   Torneos). Después:
   - **Torneos**: aparecen los online del calendario.
   - **Calendario**: al tocar uno, lleva a su ficha; arriba, «Abrir en su web».
4. `-SoloSubir`.

Los que no tengan nada apuntado se borran a los 3 días de su fecha; los que sí, se cierran a
los 7. Ya no depende del cron, aunque sigue siendo buena idea poner `CRON_SECRET` en Vercel
para los avisos de Discord de los lunes.
