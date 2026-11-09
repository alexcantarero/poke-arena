# IMPLEMENTAR v0.115.0

**Acumulativo sobre la v0.113.0**: lleva también la v0.114.0 (Bye, fecha real de las partidas
atrasadas y calendario; ver `IMPLEMENTAR-v0.114.0.md`). Si ya aplicaste la v0.114, aplícalo
encima igualmente.

**Sin migración, sin dependencias nuevas y sin variables de entorno nuevas.** (Las migraciones
`0031` y `0032` de la v0.112/v0.113 siguen pendientes si aún no las has aplicado.)

> **Cambia el cálculo del Elo.** Al desplegar, el Elo y su gráfica se recalculan desde la primera
> partida con las reglas nuevas y los números se moverán de golpe. No se borra nada: volver a la
> v0.114 deja el Elo como estaba.

## 1. Aplicar (automático)

1. Descomprime `arena-v0.115.0.zip` en la **raíz del repo**.
2. Doble clic en **`aplicar-v0.115.bat`**: comprueba el repo (acepta 0.113.0 o 0.114.0), copia
   los ficheros de `_v0.115/`, borra lo que sobra, lanza `npm run verificar` y `npm run build`,
   y si todo pasa se borra a sí mismo y enseña `git status`.
3. Prueba con `npm run dev` y haz el commit.

## 2. Ficheros (v0.115; los de la v0.114 están en su guía)

**Nuevos:** `src/lib/forma.ts`, `src/lib/divisionElo.ts`, `src/components/DivisionEloBadge.tsx`,
`tests/eloV115.test.ts`, `IMPLEMENTAR-v0.115.0.md`.

**Modificados:** `src/lib/stats.ts` (motor del Elo), `src/lib/data.ts` (`snap.forma`, datos de
torneo para el Elo, marcas del bonus en la gráfica), `src/lib/ladderSeries.ts`,
`src/lib/cinturon.ts`, `src/actions/cinturon.ts`, `src/app/(app)/cinturon/page.tsx`,
`src/app/(app)/page.tsx`, `src/app/(app)/perfil/[id]/page.tsx`, `src/app/(app)/ranking/page.tsx`,
`src/components/RankingTable.tsx`, `src/components/RankingTodoTable.tsx`, `src/app/globals.css`,
`src/lib/i18n.ts`, `tests/eloMulti.test.ts`, `tests/cinturon.test.ts`, `package.json`,
`package-lock.json`, `CHANGELOG.md`.

**Borrados:** `IMPLEMENTAR-v0.110.0.md`, `IMPLEMENTAR-v0.110.1.md`, `IMPLEMENTAR-v0.111.0.md` y
restos de scripts de aplicación anteriores (`aplicar-v0.110.*`, `aplicar-v0.114.*`, `_v0.110/`,
`_v0.114/`).

## 3. Probar

1. **Inicio → Ranking → Elo**: la cifra es la **Forma** (pasa el ratón para ver el Elo) y cada fila
   lleva su división con el color del tier. Quien tenga el Cinturón sale como Challenger; quien
   tenga menos de 10 partidas, como Novato.
2. **Perfil**: insignia de división junto al nombre y una tarjeta «Forma» con el desglose
   (partidas en 90 días, lo que resta por pocas partidas y por inactividad).
3. **Ranking** (todas las tablas): la columna Elo lleva la insignia de división.
4. **Evolución del Elo**: el bonus de cada torneo sale como un punto marcado con su torneo.
5. **Cinturón**: con menos de top 5 de Forma y menos de 1200, el botón de retar no se ofrece.
6. Revisa que los números tengan sentido con vuestros datos. Si alguna cifra no convence (pesos,
   rivales, bonus, umbrales de división o de Forma), está todo en `src/lib/stats.ts`,
   `src/lib/forma.ts` y `src/lib/divisionElo.ts`, con sus pruebas.

## Deshacer

`git revert` del commit. No hay cambios de esquema; el Elo vuelve a calcularse como antes.
