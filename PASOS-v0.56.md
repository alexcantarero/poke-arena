# Cómo aplicar la v0.56 — un zip y un comando

Lleva dentro de la v0.50 a la v0.55 (incluida la migración de la v0.54, que el script lanza sola).

1. Pon en Descargas `pokearena-v0.56-completa.zip` (sin descomprimir) y `aplicar-v0.56.ps1`.
2. En la terminal de VS Code, en la carpeta del proyecto:

   ```powershell
   powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\aplicar-v0.56.ps1"
   ```

3. Míralo con `npm run dev`:
   - **PC**: el botón ««» arriba de la barra lateral la pliega a iconos, y el contenido se ensancha.
     Recarga: sigue como la dejaste.
   - **Ranking → Evolución del Elo**: «Último mes · 3 meses · Todo». Con huecos de más de dos
     semanas, la línea se corta en vez de unir los puntos.
   - **Liga → Enfrentamientos directos**: los números de las casillas se leen sobre cualquier tinte.
   - **Ajustes → Glosario**, y en Estadísticas, «espejo» y «bye» subrayados: tócalos.
   - **La bienvenida** sale solo a jugadores con menos de 30 días en la liga. Para verla tú, en el
     navegador: herramientas (F12) → Consola → `localStorage.removeItem("arena-bienvenida-vista")`,
     y date de alta un usuario de prueba.
4. Súbelo: el mismo comando con `-SoloSubir` al final.
