# PokeArena TCG v0.46.0 — pantalla de carga con una Ball

Va sobre la **v0.45.0**. **Sin migración, sin dependencias, sin variables de entorno.**

> **Orden:** aplica antes la **v0.45** si no lo has hecho. Esa sí lleva migración
> (`drizzle/0018_v0_45_0.sql`), y esta va construida encima.

## Paso 1 — Descomprime

| | Fichero |
|---|---|
| M | `package.json`, `CHANGELOG.md` |
| M | `src/app/globals.css` |
| M | Las seis `loading.tsx`: `src/app/(app)/` y sus carpetas `estadisticas`, `ranking`, `resultados`, `topdecks`, `torneos` |
| M | `src/components/primitives.tsx`, `src/components/ui.tsx` |
| U | `src/components/CargandoBall.tsx`, `src/lib/balls.ts`, `tests/balls.test.ts` |

## Paso 2 — Verifica

```bash
npm run verificar   # 515 de 515
npm run build
npm run dev
```

## Paso 3 — Míralo

La pantalla de carga solo se ve si el servidor tarda, y en `npm run dev` en local suele ir
rápido. Para verla con calma: en las herramientas del navegador (F12) → pestaña **Red** → limita
la velocidad a «3G lenta», y cambia de pestaña en la app.

1. En el centro: una ficha oscura redonda, con un círculo blanco girando y una Ball dentro que se
   sacude. Debajo, el texto de cada sección.
2. Recarga varias veces: la Ball cambia. La mayoría de las veces Poké, Super o Ultra Ball.
3. Con el tema claro y con el oscuro: el círculo se ve igual en los dos, porque va sobre la ficha.
4. **Ajustes → Apariencia → animaciones «No»**: la Ball tiene que seguir viéndose, quieta.

## Por qué las Balls no están dibujadas

La Poké Ball y las demás son diseños de Pokémon. La regla de este proyecto desde la v0.11 es no
dibujar diseños de Pokémon, sino usar sus sprites publicados, como ya se hace con los arquetipos.
Estas salen del repositorio oficial de sprites de PokéAPI, que los aloja precisamente para que se
usen. Lo único propio es la animación.

## Cómo deshacerlo

`git revert HEAD`. Vuelven los esqueletos grises.
