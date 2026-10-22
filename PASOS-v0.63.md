# Cómo aplicar la v0.63 — un zip y un comando

**Sin migración** y sin dependencias nuevas. Va encima de la v0.62.

1. Pon en Descargas `pokearena-v0.63-completa.zip` (sin descomprimir) y `aplicar-v0.63.ps1`.
2. En la terminal de VS Code, en la carpeta del proyecto:

   ```powershell
   powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\aplicar-v0.63.ps1"
   ```

   Hace `npm run verificar`, `npm run build`, las migraciones de siempre (no hay nuevas) y el
   commit. Si algo falla, para sin subir nada.

3. Míralo con `npm run dev`:
   - **El menú**: 🏥 Inicio, 🗺️ Calendario, 🏅 Liga… en la barra lateral, en la de abajo del
     móvil y en «Más».
   - **Ajustes**: los grupos nuevos (Este dispositivo · Jugadores · Invitaciones · La liga ·
     Torneos y CP · Importar datos · Arquetipos). Guarda «La liga» y comprueba que la temporada
     de CP de «Torneos y CP» no ha cambiado (y al revés).
   - **Ajustes → Importar datos → Diagnóstico de Ciphermaniac**: si sigue dando 403, ahora
     dice por qué y enlaza su formulario.
   - **Una liga**: la clasificación en el móvil enseña récord y %V.
   - **Torneos**: toca «Tus CP» → tu perfil, en Championship Points. Filtro en el móvil.
   - **Calendario**: marca Regional y League Cup a la vez.
   - **Registrar partida → Detallar juegos**: las fundas del color de cada uno y los objetos.
   - **Una ronda de torneo**: el panel de enfrentamiento.
4. Súbelo: el mismo comando con `-SoloSubir` al final.

## Ficheros

Nuevos: `src/components/NavIcono.tsx`, `src/components/ObjetoSprite.tsx`,
`src/lib/objetos.ts`, `src/lib/estadoFuente.ts`, `tests/objetos.test.ts`,
`tests/estadoFuente.test.ts`, `tests/calendarioFiltro.test.ts`.

Modificados: `src/actions/ajustes.ts`, `src/app/(app)/ajustes/page.tsx`,
`src/app/(app)/ajustes/ciphermaniac/page.tsx`, `src/app/(app)/calendario/page.tsx`,
`src/app/(app)/competiciones/[id]/page.tsx`, `src/app/(app)/mas/page.tsx`,
`src/app/(app)/partidas/[id]/page.tsx`, `src/app/(app)/torneos/page.tsx`,
`src/app/(app)/torneos/[id]/page.tsx`, `src/app/globals.css`, `src/components/CpBreakdown.tsx`,
`src/components/MatchForm.tsx`, `src/components/Nav.tsx`, `src/components/PrizePicker.tsx`,
`src/components/RoundForm.tsx`, `src/lib/calendar.ts`, `src/lib/i18n.ts`, `src/lib/nav.ts`,
`src/lib/sources/ciphermaniac.ts`, `package.json`, `CHANGELOG.md`.

## Deshacer

`git revert HEAD` (es un solo commit). No toca la base de datos.
