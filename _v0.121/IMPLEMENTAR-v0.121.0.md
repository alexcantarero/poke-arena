# IMPLEMENTAR v0.121.0

Va **encima de la v0.120.0**: aplica primero la v0.120, pruébala y, si todo va bien, esta.
**Sin migración ni dependencias nuevas.**

## 1. Aplicar

1. Descomprime `arena-v0.121.0.zip` en la **raíz del repo**.
2. Doble clic en **`aplicar-v0.121.bat`** (acepta 0.120.0): copia `_v0.121/`, borra lo que sobra,
   lanza `npm run verificar` y `npm run build`, y si todo pasa se borra solo.

**Variable opcional en Vercel:** `META_TORNEOS_POR_MES` (entre 10 y 60; sin ella, 30). Es cuántos
torneos online por mes se usan para el meta y la tendencia. Si Top Decks tarda en la primera carga,
ponla a `20` y vuelve a desplegar.

**Borra:** `IMPLEMENTAR-v0.117.0.md` y los restos del script de la v0.120.

## 2. Ficheros

**Nuevos:** `src/components/statistics/GraficoTendenciaMeta.tsx`, `IMPLEMENTAR-v0.121.0.md`.

**Modificados:** `src/app/(app)/estadisticas/page.tsx`, `src/app/(app)/topdecks/page.tsx`,
`src/components/MetaIrlTable.tsx`, `src/lib/metaIrl.ts`, `src/lib/sources/limitless.ts`,
`src/lib/i18n.ts`, `src/app/globals.css`, `tests/metaIrl.test.ts`, `package.json`,
`package-lock.json`, `CHANGELOG.md`.

## 3. Probar

1. **Estadísticas → Online**: debajo del meta sale «Cómo se mueve el meta online» con los 8 más
   jugados y tres barras cada uno (hace dos meses, el pasado, este mes). Arriba, cuántos torneos se
   han usado de cada mes.
2. **Top Decks → Presencial** y **→ City Leagues**: cada mazo lleva las barritas de tendencia. Un mes
   sin eventos importados sale como «—»; un mes con eventos donde ese mazo no apareció, como 0.
3. Con `META_TORNEOS_POR_MES=20`, la primera carga de Top Decks pide menos clasificaciones.
4. **Idioma EN**: los textos nuevos salen en inglés.

## Deshacer

`git revert` del commit.
