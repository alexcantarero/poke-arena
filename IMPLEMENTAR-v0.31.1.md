# PokeArena TCG v0.31.1 — cómo aplicarla

Va sobre la **v0.31.0**.

> **No lleva migración de base de datos.** Sin dependencias ni variables de entorno nuevas.

---

## Paso 1 — Actualiza el código

Integra los cambios de la v0.31.1 respetando las rutas del repositorio.

## Paso 2 — Verifica

```bash
npm test
npx tsc --noEmit
npm run build
```

## Paso 3 — Pruébalo a mano

Pulsa varias veces el emblema de estación: cada clic debe mostrar un solo Pokémon, elegido
aleatoriamente de la lista activa. Puede salir repetido.

## Personalizar los Pokémon

Edita `src/lib/pokemonEstacion.ts`:

- `POR_ESTACION.primavera`, `.verano`, `.otono` e `.invierno` contienen las listas normales.
- `HALLOWEEN` sustituye la lista de otoño entre el 24 de octubre y el 1 de noviembre.
- Para añadir uno, agrega una entrada con `slug`, `nombre` y `tipo`.
- Para quitarlo, elimina esa entrada. No hace falta editar el componente de animación.
- `slug` debe ser el nombre que acepta la ruta de sprites que ya usa la aplicación.

Navidad y Mundial todavía utilizan la selección de su estación; solo Halloween tiene una lista
especial. Otras celebraciones requieren definir su propia lista y asignarla según `estacion.evento`.

## Cómo deshacerlo

**El código:** `git revert HEAD`.

**La base de datos:** no hay cambios que deshacer.
