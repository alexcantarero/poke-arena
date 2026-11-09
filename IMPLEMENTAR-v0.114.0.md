# IMPLEMENTAR v0.114.0

Actualización sobre la **v0.113.0**. **Sin migración, sin dependencias nuevas y sin variables de
entorno nuevas.** (Las migraciones `0031` y `0032` de la v0.112/v0.113 siguen pendientes si aún
no las has aplicado: ver sus guías.)

## 1. Aplicar (automático)

1. Descomprime `arena-v0.114.0.zip` en la **raíz del repo** (donde está `package.json`).
2. Doble clic en **`aplicar-v0.114.bat`**. El script comprueba el repo y la versión, copia los
   13 ficheros de `_v0.114/`, borra lo que sobra (abajo), lanza `npm run verificar` y
   `npm run build`, y si todo pasa se borra a sí mismo y enseña `git status`.
3. Prueba con `npm run dev` y haz el commit.

A mano: copia `_v0.114/` encima de la raíz, borra la lista y ejecuta `npm run verificar` y
`npm run build`.

## 2. Ficheros

**Nuevos:** `tests/byeTorneo.test.ts`, `IMPLEMENTAR-v0.114.0.md`.

**Modificados:** `src/actions/partidas.ts`, `src/actions/torneos.ts`,
`src/app/(app)/calendario/page.tsx`, `src/app/globals.css`, `src/components/EventForm.tsx`,
`src/components/MatchForm.tsx`, `src/components/RoundForm.tsx`, `src/lib/i18n.ts`,
`package.json`, `package-lock.json` (solo la versión), `CHANGELOG.md`.

**Borrados:** `IMPLEMENTAR-v0.110.0.md`, `IMPLEMENTAR-v0.110.1.md`, `IMPLEMENTAR-v0.111.0.md` y,
si quedaron, `aplicar-v0.110.bat` / `aplicar-v0.110.ps1` / `_v0.110/`.

## 3. Probar

1. **Bye**: en un torneo abierto, «Apuntar ronda» → «Bye (ronda libre)». Desaparecen rival, mazo
   del rival y resultado; se puede guardar. La ronda sale contra «BYE», el récord suma una
   victoria y el mazo no aparece en la matriz de emparejamientos. Quitar el Bye devuelve el
   formulario normal (rival y mazo obligatorios otra vez).
2. **Fecha real**: con una partida de liga pendiente de una jornada pasada, apúntala con
   resultado rápido. Debe quedar con la fecha de hoy y salir hoy en «Actividad diaria».
   Desde el formulario completo, la fecha propuesta es hoy y debajo pone de qué jornada era.
   Corregir después el resultado no cambia la fecha.
3. **Calendario** (vista Calendario, como organizador):
   - «¿Qué es?» con dos grupos. Con «Jornada» sale «Competición asociada»; con un tipo de
     torneo, «Torneo asociado». Elegir un torneo rellena nombre, fechas y lugar si estaban vacíos.
   - Guarda una Cup: en la rejilla sale con el color de Cup.
   - «Eventos oficiales de Europa» dice «N de 11 ya en el calendario».
   - El botón de la lista pegada dice «Importar la lista».
4. **Idioma EN**: todo lo nuevo sale en inglés.

## Partidas ya guardadas con la fecha de la jornada

Esto corrige lo que se apunte a partir de ahora. Las atrasadas que ya estén guardadas con la fecha
de su jornada no se pueden arreglar solas (no consta cuándo se jugaron): ábrelas, cambia la fecha
en «Contexto» y guarda.

## Deshacer

`git revert` del commit de la v0.114.0. No hay cambios de esquema.
