# IMPLEMENTAR v0.89.0

**Sin migración.** Lleva dentro de la v0.82 a la v0.88 (sus `IMPLEMENTAR` van en el paquete).

1. Descomprime el paquete en Descargas: sueltos `pokearena-v0.89-completa.zip` y `aplicar-v0.89.ps1`.
2. `powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\aplicar-v0.89.ps1"`
3. Prueba:
   - **Torneos → la lupa**: escribe «niza» o «cup maquina» y pulsa Intro.
   - **Estados**: los torneos de días que aún no han llegado salen «Borrador»; los de hoy o
     anteriores sin cerrar, «En curso»; los cerrados, «Cerrado». El filtro de estado usa esos tres.
   - Un borrador cuya fecha es hoy: al entrar en su ficha ya está «En curso» y admite rondas.
4. `-SoloSubir`.

## Deshacer

`git revert HEAD`. Los borradores que se hayan abierto solos siguen abiertos (es lo mismo que
pulsar «Empezar»).
