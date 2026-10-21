# Cómo aplicar la v0.54 — un zip y un comando

Lleva dentro de la v0.50 a la v0.53, y sirve estés en la que estés desde la v0.49.

1. Pon en Descargas `pokearena-v0.54-completa.zip` (sin descomprimir) y `aplicar-v0.54.ps1`.
2. En la terminal de VS Code, en la carpeta del proyecto:

   ```powershell
   powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\aplicar-v0.54.ps1"
   ```

   **Esta lleva una migración** (rastro de correcciones). El script la lanza sola contra la base de
   tu `.env.local`. Si producción usa otra base, pega `drizzle/0020_v0_54_0.sql` en el SQL Editor
   de Neon de esa rama: es seguro de repetir.

3. Míralo con `npm run dev`, mejor desde el móvil:
   - **Inicio**: si tienes partidas de liga sin resultado, salen arriba. Toca «Resultado», elige
     el marcador, y ya.
   - **El menú**: un número con esas partidas, sobre «Inicio» en el móvil y «Liga» en el PC.
   - **Liga → una liga → Pendientes**: lo mismo, para cualquier partida (organizadores).
   - **Corrige una partida ya jugada**: en su ficha pone quién la corrigió y cuándo.
4. Súbelo: el mismo comando con `-SoloSubir` al final.
