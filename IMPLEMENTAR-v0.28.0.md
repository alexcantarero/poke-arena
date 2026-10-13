# PokeArena TCG v0.28.0 — cómo aplicarla

Va sobre lo que tienes **ahora mismo en el disco** (la v0.27.0 sin commitear, del 12/10).

> **Sin migración de base de datos. Sin dependencias nuevas. Sin variables de entorno nuevas.**
> No hace falta tocar Neon ni Vercel.

Todo lo de abajo se hace en VS Code: la terminal integrada (`Ctrl+ñ`) y el panel de Control de
código fuente (`Ctrl+Shift+G`).

---

## Paso 0 — Commitea PRIMERO lo tuyo (importante)

Tu v0.27.0 está en el disco sin commitear. Si descomprimes mi zip encima sin guardar lo tuyo
antes, el diff mezclará tus cambios con los míos y no podrás distinguirlos ni revertir solo una
parte.

En la terminal, dentro de la carpeta del repo:

```bash
git status
git add -A
git commit -m "feat: resumen de liga, mapa de enfrentamientos y arquetipos agrupados (v0.27.0)"
```

**Comprobación:** `git status` debe decir «nothing to commit, working tree clean».

> Si `git status` sale con un montón de ficheros marcados como modificados que tú no has tocado,
> son finales de línea (CRLF). No pasa nada, commitea igual.

---

## Paso 1 — Descomprime el zip encima del repo

Descomprime `pokearena-v0.28.0-cambios.zip` en la raíz del repo, **respetando las rutas** y
sobrescribiendo. Son 17 ficheros: 14 modificados y 3 nuevos.

**Comprobación:** en el panel de Control de código fuente de VS Code deben aparecer exactamente
estos cambios y ninguno más:

| | Fichero |
|---|---|
| M | `package.json` (0.27.0 → 0.28.0) |
| M | `CHANGELOG.md` |
| M | `.gitignore` |
| M | `docs/README.md` |
| M | `src/lib/data.ts` |
| M | `src/app/(app)/layout.tsx` |
| M | `src/app/(app)/mesa/page.tsx` |
| M | `src/app/(app)/mas/page.tsx` |
| M | `src/app/(app)/topdecks/page.tsx` |
| M | `src/app/(app)/torneos/nuevo/page.tsx` |
| M | `src/app/(app)/perfil/editar/page.tsx` |
| M | `tests/arquetipos.test.ts` |
| M | `tests/rounds.test.ts` |
| M | `tests/v0_5_0.test.ts` |
| U | `CLAUDE.md` |
| U | `docs/13-plan-rendimiento.md` |
| U | `IMPLEMENTAR-v0.28.0.md` |

---

## Paso 2 — Borra los 21 scripts temporales del repositorio

Están commiteados en la raíz y por tanto subidos a GitHub. Son residuos de sesiones de agente.

```bash
git rm --cached ajustes.py check.py fix-db2.ts fix_actions.py fix_actions2.py \
  fix_i18n.py fix_imports.py fix_matchform.py fix_nav.py fix_nueva.py \
  home_fix.py home_fix2.py home_fix3.py home_fix4.py home_fix5.py home_fix6.py \
  replace_action.py rm_id.py ur_fix.py ur_fix2.py ur_fix_h3.py
rm -f ajustes.py check.py fix-db2.ts fix_*.py home_fix*.py replace_action.py rm_id.py ur_fix*.py
```

El `.gitignore` nuevo ya impide que vuelvan a colarse (`fix*.py`, `home_fix*.py`, `ur_fix*.py`…).

**Comprobación:** `ls *.py` no debe devolver nada.

---

## Paso 3 — Verifica

```bash
npm test
npx tsc --noEmit
npm run build
```

Lo que debe salir:

- **`npm test` → 353 de 353.** Lo he ejecutado aquí con tu `node_modules` real.
- **`npx tsc --noEmit` → sin ninguna salida.** También verificado. Antes había 4 errores en los
  ficheros de test; están corregidos.
- **`npm run build` → esto solo lo puedes comprobar tú.** Yo no puedo lanzarlo: el `node_modules`
  del zip viene de Windows y le falta el binario de SWC para Linux.

**Si el build falla**, lo más probable es que sea por el getter de `elo` en `src/lib/data.ts`.
Pégame el error tal cual y lo arreglo. La vuelta atrás rápida de esa pieza está más abajo.

---

## Paso 4 — Commit y push

```bash
git add -A
git commit -m "perf: el layout y cinco pantallas dejan de cargar el snapshot entero (v0.28.0)"
git push origin development
```

---

## Paso 5 — Comprueba que sirvió

Despliega a producción como siempre y, **dos o tres días después**:

- **Vercel → Usage → Active CPU.** Es la cifra que manda en el plan Hobby (unas 4 horas al mes).
  Debería bajar de forma visible: 17 de las 23 pantallas han dejado de recalcular el Elo y 6 han
  dejado de leer la base entera.
- **Neon → Monitoring → compute hours.**

Apunta las dos cifras. Sin un número de partida, la siguiente fase del plan de rendimiento se
decide a ojo.

Y dale un repaso rápido a las pantallas que he tocado, que es donde estaría un fallo que ni los
tests ni el compilador ven: **Mi Mesa**, **Más**, **Top Decks**, **Nuevo torneo** y **Editar
perfil**. En las cinco tiene que verse lo mismo que antes.

---

## Qué he cambiado y por qué

### 1. El layout ya no carga la base entera

`src/app/(app)/layout.tsx` envuelve **todas** las pantallas, así que lo que pidiera ahí lo pagaba
cada visita a cualquier página. Pedía `loadSnapshot()` —las 13 tablas, con todas las partidas y
todos los juegos— para sacar dos cosas: el jugador de la sesión y el nombre de la liga.

Ahora pide `currentPlayer()` y `loadConfig()`. Dos consultas pequeñas.

Esto era el bloqueo de fondo: mientras el layout cargara el snapshot, afinar una pantalla suelta
no servía de nada, porque la carga ya se había hecho.

### 2. El Elo se calcula solo si alguien lo pide

`eloTable()` recorre **todas** las partidas en orden cronológico y era el trabajo de CPU más caro
del snapshot. Solo 6 de las 23 pantallas leen `.elo` (inicio, ranking, perfil, liga, ficha de liga
y ficha de partida). Las otras 17 lo pagaban sin usarlo.

Ahora es un getter memoizado por petición: `snap.elo` se lee exactamente igual desde fuera y
ninguna pantalla cambia.

**Lo único que hay que recordar**: no hagas `{ ...snap }` ni serialices el snapshot entero, porque
eso dispara el getter. Está avisado en un comentario encima del código.

### 3. Cinco pantallas con consultas propias

`/mesa` y `/perfil/editar` (jugadores y arquetipos), `/topdecks` (arquetipos), `/mas` (el jugador
de la sesión) y `/torneos/nuevo` (los ajustes). Ninguna llama ya a `loadSnapshot()`.

Los tres cargadores nuevos (`loadConfig`, `loadPlayers`, `loadArchetypes`) están envueltos en
`cache()` y **`loadSnapshot()` los reutiliza**, así que una pantalla que pida las dos cosas no
consulta dos veces.

### 4. Los 4 errores de tipos de los tests

Fixtures a los que les faltaban campos que el tipo exige: `firstPlayed` / `firstWins` /
`secondPlayed` / `secondWins` en `arquetipos.test.ts`, y `opponentPlayerId` en `rounds.test.ts` y
`v0_5_0.test.ts`. Ahora `npx tsc --noEmit` sale limpio, que es lo que permite usarlo como alarma:
mientras hubiera errores conocidos, un error nuevo pasaba desapercibido.

### 5. El CHANGELOG, reconstruido

Saltaba de la 0.14.0 (28/09) a la 0.27.0 (12/10). He recuperado del historial de Git las guías
`IMPLEMENTAR-v0.15.0.md` … `IMPLEMENTAR-v0.25.0.md`, que seguían ahí aunque los ficheros estén
borrados, y he escrito las entradas de la 0.15.0 a la 0.26.0 con su contenido real. **No hay nada
inventado**: todo sale de esas guías o del historial de commits.

La 0.26.0 no existía como versión: ese trabajo (Mi Mesa, el selector de Regional, la seguridad de
Fase 1, el primer turno por arquetipo) se subió en commits sueltos y `package.json` se quedó en
0.25.0 hasta la 0.27.0. Le he dado entrada propia para que el salto quede explicado.

### 6. `CLAUDE.md` y `docs/13-plan-rendimiento.md`

`CLAUDE.md` es lo que lee Claude Code al empezar. Tiene el mismo contenido que tu `AGENTS.md` (que
lee Antigravity) más el detalle del proyecto: mapa del código, reglas que no se negocian,
protocolo de trabajo y la deuda conocida.

**Si cambias uno, cambia el otro.** Si no, cada agente obedece reglas distintas sobre la misma
base de datos.

`docs/13-plan-rendimiento.md` tiene el plan por fases para el resto del refactor, con las tareas
ya redactadas para pegárselas a un agente y la tabla medida de qué usa cada pantalla del snapshot.

---

## Cómo deshacerlo

**Todo:**

```bash
git revert HEAD
```

**Solo el getter perezoso del Elo**, si el build se queja: en `src/lib/data.ts`, sustituye

```ts
    get elo() {
      eloCache ??= eloTable(matchesFull, playerRows, config, tourWeights);
      return eloCache;
    },
```

por

```ts
    elo: eloTable(matchesFull, playerRows, config, tourWeights),
```

El resto de la versión no depende de eso.

**Solo el layout**, si algo raro pasa con la sesión: vuelve a `loadSnapshot()` y a
`snap.playersById.get(session.playerId)`. Es el bloque de las líneas 27–34.

---

## Lo siguiente

1. **Fase A del plan de rendimiento** (`docs/13-plan-rendimiento.md`): paginar las partidas en
   Resultados en el servidor. Riesgo bajo, y es la pantalla que más crece con el historial.
2. **Migrar `pokemontcg.io` a TCGdex.** Muere el 1 de marzo de 2027. Es reescribir
   `src/lib/sources/pokemontcg.ts` y nada más, pero tiene fecha.
3. **Decidir si la app va a ser solo tuya o de más organizadores.** `settings` tiene una sola fila
   (`id = "default"`): hay una liga implícita en el esquema. Cada tabla nueva encarece esa
   migración. Conviene decidirlo antes de añadir más pantallas, aunque la respuesta sea «de
   momento no».
