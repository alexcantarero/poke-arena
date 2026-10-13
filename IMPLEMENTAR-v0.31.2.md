# PokeArena TCG v0.31.2 — cómo aplicarla

Va sobre la **v0.31.1**.

> **No lleva migración de base de datos.** Sin dependencias ni variables de entorno nuevas.

---

## Paso 1 — Actualiza el código

Integra los cambios de la v0.31.2 respetando las rutas del repositorio.

## Paso 2 — Verifica

```bash
npm test
npx tsc --noEmit
npm run build
```

## Paso 3 — Fechas especiales

- **14 de febrero:** San Valentín, con Eevee, Clefairy, Togepi, Sylveon, Luvdisc, Alomomola
  y Jigglypuff.
- **27 de febrero:** Día de Pokémon, con Pichu, Pikachu, Raichu, Eevee y los iniciales de
  Kanto.
- **Halloween:** mantiene la ventana ya existente (24 de octubre–1 de noviembre) y su lista
  fantasma incluye Pumpkaboo, Dusknoir y Dhelmise.
- **Navidad:** mantiene la ventana ya existente (15 de diciembre–6 de enero).

Al pulsar el emblema en una fecha especial, aparece un Pokémon aleatorio de la lista del evento.
El calendario y las listas siguen siendo independientes del acceso a la base de datos.

## Personalizar listas

Edita `eventos` en `src/lib/pokemonEstacion.ts`. Cada entrada tiene `nombre`, `fecha` y
`pokemon`; cada Pokémon tiene `slug`, `nombre` y `tipo`. Las listas estacionales que no coinciden
con una celebración especial siguen en `POR_ESTACION`.

## Cómo deshacerlo

**El código:** `git revert HEAD`.

**La base de datos:** no hay cambios que deshacer.
