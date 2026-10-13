# PokeArena TCG v0.31.0 — cómo aplicarla

Va sobre la **v0.30.0**.

> **No lleva migración de base de datos.** Sin dependencias ni variables de entorno nuevas.

---

## Paso 1 — Actualiza el código

Integra los cambios de la v0.31.0 respetando las rutas del repositorio.

## Paso 2 — Verifica

```bash
npm test
npx tsc --noEmit
npm run build
```

## Paso 3 — Pruébalo a mano

1. En escritorio, pulsa el nombre/emblema de la estación en la barra lateral. En móvil, pulsa
   el emblema de la cabecera.
2. En otoño, verifica que aparecen solo Pokémon fantasma. Durante Halloween la selección
   incluye además a Pumpkaboo y Chandelure, sin mezclar otros tipos.
3. Comprueba que el efecto desaparece solo y que volver a pulsar lo reproduce.
4. Activa «Animaciones: no» o «reducir movimiento»: los sprites se muestran brevemente sin
   movimiento.
5. Usa Tab y Enter/Espacio para activar el emblema y confirma que el foco queda visible.

Los meses de otras estaciones tienen selecciones de planta, agua/fuego e hielo, respectivamente.
Las pruebas puras comprueban las listas sin depender del calendario del día.

## Qué se ha hecho

- El emblema de estación en escritorio y móvil es un botón accesible.
- La selección estacional vive en `src/lib/pokemonEstacion.ts`; otoño y Halloween solo usan
  Pokémon fantasma.
- La animación es efímera y decorativa; se apaga cuando el usuario reduce movimiento.
- Los sprites usan la misma URL de Limitless que ya utiliza la aplicación. La URL pertenece a
  un tercero y no es un contrato de disponibilidad.

## Cómo deshacerlo

**El código:** `git revert HEAD`.

**La base de datos:** no hay cambios que deshacer.
