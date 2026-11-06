# IMPLEMENTAR v0.110.0

Actualización sobre la **v0.109.0**. **Sin migración, sin dependencias nuevas y sin variables
de entorno nuevas.**

## 1. Aplicar (automático)

1. Descomprime `arena-v0.110.0.zip` en la **raíz del repo** (donde está `package.json`).
   Aparecen `aplicar-v0.110.bat`, `aplicar-v0.110.ps1` y la carpeta `_v0.110/`.
2. Doble clic en **`aplicar-v0.110.bat`**. El script:
   - comprueba que está en el repo de PokeArena y que la versión es la 0.109.0 (si no, pregunta);
   - copia los 19 ficheros de `_v0.110/` encima de los tuyos (UTF-8, sin tocar `.env*`);
   - borra los ficheros que ya no hacen falta (lista abajo) — solo si existen;
   - ejecuta `npm run verificar` y, si pasa, `npm run build`;
   - se borra a sí mismo y la carpeta `_v0.110/`, y enseña `git status`.
3. Revisa el resultado, prueba con `npm run dev` y haz el commit.

Si prefieres hacerlo a mano: copia el contenido de `_v0.110/` en la raíz sobrescribiendo, borra la
lista de abajo y ejecuta `npm run verificar` y `npm run build`.

## 2. Ficheros

**Nuevos:** `src/components/FormatoActual.tsx`, `src/data/formatoEstandar.ts`,
`src/lib/formato.ts`, `src/lib/recencia.ts`, `tests/formato.test.ts`, `tests/recencia.test.ts`,
`IMPLEMENTAR-v0.110.0.md`.

**Modificados:** `src/app/(app)/page.tsx`, `src/app/(app)/topdecks/page.tsx`,
`src/app/(app)/herramientas/page.tsx`, `src/app/globals.css`, `src/components/MatchForm.tsx`,
`src/components/Herramientas.tsx`, `src/lib/i18n.ts`, `src/lib/objetos.ts`,
`src/lib/recomendadorDatos.ts`, `package.json`, `package-lock.json` (solo la versión),
`CHANGELOG.md`.

**Borrados:** `IMPLEMENTAR-v0.82.0.md` … `IMPLEMENTAR-v0.109.0.md` (28 guías antiguas; el
historial está en el CHANGELOG), `arena-v0.95.0-cambios.zip`, `PENDIENTES-CLAUDE-CODE-v0.94.0.md`,
`docs/pendientes-claude-code-v0.93.0.md`, `docs/respaldo/` y `15-uso-vercel-neon.md` de la raíz
(copia de `docs/15-uso-vercel-neon.md` con una línea de más). No se toca `correos-fuentes-de-datos.md`.

## 3. Probar

1. **Inicio → Ranking**: pestañas Elo · CP · Ball. En Ball, cada fila con su Ball, puntos y barra;
   con más de seis personas, «Ver los N restantes». Un enlace viejo `/?rk=liga` abre Elo.
2. **Top Decks** (Online y Presencial) y **Herramientas**: arriba, la tarjeta «Formato Estándar».
   Hoy (6/11) debe decir: vigente 30th Celebration; Delta Reign a la venta, legal el 20 nov
   (faltan 14 días); siguiente Flowing Fists, 5 feb 2027, prevista; marcas H · I · J; rotación sin
   anunciar (abril de 2027, sale la H); fin de temporada Mundial 2027. Pliega y despliega.
3. **Registrar partida**: «Configura la partida» arriba con Formato, Mazos y Cómo apuntar.
   - «Mazo distinto en cada juego» + «Rápido»: elige 2-1 y salen tres juegos con su selector de
     mazo para cada lado. Los selectores tienen grupo «Tuyos» y «Solo el arquetipo».
   - En liga, el mazo que ganó un juego no se ofrece al mismo jugador en el siguiente.
   - Guarda y abre la partida: el mazo de cada juego es el arquetipo del mazo elegido.
   - El resumen «Bo3 · Mismo mazo · Rápido» del resultado lleva arriba al tocarlo.
4. **Herramientas → Recomendador**: debajo de las fuentes sale la nota «Lo reciente pesa más».
   Con varios Regionales importados, el orden debe acercarse al meta del último.
5. **Idioma EN**: todo lo nuevo sale en inglés.

## 4. Mantener el formato al día

Cuando salga una expansión o se anuncie la rotación de 2027, edita **solo**
`src/data/formatoEstandar.ts` (fechas, `oficial`, `rotacionSiguiente.fecha`) y cambia `revisado`.
`npm test` comprueba que las fechas están bien escritas y en orden. Si pasan más de 75 días sin
revisarlo, la propia tarjeta lo avisa.

## Deshacer

`git checkout -- .` antes del commit, o `git revert` del commit de la v0.110.0. No hay cambios de
esquema.
