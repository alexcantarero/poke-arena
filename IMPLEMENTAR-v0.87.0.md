# IMPLEMENTAR v0.87.0 — iPhone

**Sin migración.** Lleva dentro de la v0.82 a la v0.86 (sus `IMPLEMENTAR` van en el paquete).

1. Descomprime el paquete en Descargas: sueltos `pokearena-v0.87-completa.zip` y `aplicar-v0.87.ps1`.
2. `powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\aplicar-v0.87.ps1"` y `-SoloSubir`.
3. **En el iPhone (Safari)**, repite lo de los vídeos en un torneo:
   - Toca «Contra qué mazo» y escribe: la lista sale arriba, entera, sobre un fondo oscuro, y el
     teclado no la tapa. Tocar el fondo la cierra.
   - Mientras escribes, la barra de abajo (Inicio, Estadísticas, +…) desaparece.
   - Ya no sale «Autorrellenar contacto» al buscar mazo ni al escribir el rival.
   - Guarda una ronda con rival de fuera: el nombre del rival se guarda igual que antes.
   - Si la app está abierta de antes, ciérrala del todo o recarga para coger la versión nueva.

## Deshacer

`git revert HEAD`. No toca la base de datos.
