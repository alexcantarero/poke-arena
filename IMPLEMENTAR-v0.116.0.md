# IMPLEMENTAR v0.116.0

**Acumulativo sobre la v0.113.0**: lleva también la v0.114 (Bye, fecha real, calendario) y la
v0.115 (Elo nuevo, Forma y divisiones de Elo). Ver sus guías. Sirve tengas la 0.113, 0.114 o 0.115.

## 1. Migración (antes de usar la liga por divisiones)

Neon → SQL Editor, **primero en `dev`** y, cuando lo hayas probado, en `production`:
`drizzle/0033_v0_116_0.sql`. Es idempotente (se puede lanzar dos veces). Si aún no aplicaste las
de la v0.112 y v0.113 (`0031`, `0032`), van antes. En local también vale `npm run db:migrar`
(contra la base de `.env.local`, que debe ser la de `dev`).

Sin la migración la app funciona igual: `/divisiones` dice que falta y el aviso no sale.

## 2. Aplicar el código (automático)

1. Descomprime `arena-v0.116.0.zip` en la **raíz del repo**.
2. Doble clic en **`aplicar-v0.116.bat`**: comprueba el repo, copia `_v0.116/`, borra lo que sobra,
   lanza `npm run verificar` y `npm run build`, y si todo pasa se borra solo.
3. Prueba con `npm run dev` y haz el commit.

**Variables de entorno:** ninguna nueva. Los avisos de la liga van al webhook que ya existe,
`DISCORD_WEBHOOK_LIGA`; si no está puesto, simplemente no se mandan.

## 3. Ficheros de la v0.116

**Nuevos:** `drizzle/0033_v0_116_0.sql`, `src/lib/ligaDivisiones.ts`, `src/lib/ligaTemporadaDb.ts`,
`src/actions/ligaTemporadas.ts`, `src/app/(app)/divisiones/page.tsx`, `src/components/AvisoLiga.tsx`,
`tests/ligaDivisiones.test.ts`, `tests/ligaDiscord.test.ts`, `IMPLEMENTAR-v0.116.0.md`.

**Modificados:** `src/db/schema.ts`, `src/actions/index.ts`, `src/app/(app)/layout.tsx` (aviso),
`src/app/(app)/perfil/[id]/page.tsx` (Cinturón de Liga), `src/lib/nav.ts`, `src/lib/discord.ts`,
`src/lib/discordMensajes.ts`, `src/lib/esquemaEsperado.ts`, `scripts/migrar.mjs` (conoce la 0031,
0032 y 0033), `src/lib/i18n.ts`, `src/app/globals.css`, `package.json`, `package-lock.json`,
`CHANGELOG.md`.

## 4. Probar (en dev, con la migración aplicada)

1. **Crear**: como organizador, `/divisiones` → «Abrir la inscripción». Con otra cuenta debe salir
   el aviso arriba en cualquier página; «Apuntarme» lleva a la liga. La ✕ lo esconde.
2. **Apuntarse**: apúntate con varias cuentas (o desde la base de dev). «Borrarme» quita la
   inscripción.
3. **Sorteo**: «Sortear» enseña el reparto; «Volver a sortear» lo cambia. Con 14 inscritos y máximo
   6 salen 5 / 5 / 4.
4. **Empezar**: crea las competiciones «Season 1 · División N» con todas sus jornadas (fechas de
   semana en semana). Ábrelas desde `/divisiones`: clasificación y jornadas como cualquier liga.
5. **Lista de espera**: con la temporada en curso, «Apuntarme a la siguiente».
6. **Cierre**: apunta algunos resultados → la pantalla marca Sube / Baja / Campeón. «Cerrar la
   temporada» (con partidas pendientes pide marcar la casilla). El campeón sale en su perfil como
   «Cinturón de Liga · Season 1».
7. **Siguiente temporada**: abrir otra → los de la anterior y los de espera ya aparecen apuntados;
   el reparto dice «Sale de la temporada anterior» y respeta los ascensos y descensos.

## Deshacer

`git revert` del commit. Las tablas nuevas pueden quedarse (nadie las lee sin este código) o
borrarse con `DROP TABLE liga_divisiones, liga_inscripciones, liga_temporadas;` — **borra las
temporadas**, y las competiciones de cada división siguen existiendo como ligas normales.
