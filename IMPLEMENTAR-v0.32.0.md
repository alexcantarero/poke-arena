# PokeArena TCG v0.32.0 — cómo aplicarla

Va sobre la **v0.31.2**.

> **No lleva migración de base de datos.** No añade dependencias ni variables de entorno.

## Paso 1 — Actualiza el código

Integra los cambios de la v0.32.0 respetando las rutas del repositorio.

## Paso 2 — Verifica

```bash
npm test
npx tsc --noEmit
npm run build
```

## Paso 3 — Comprueba la vitrina

En un perfil, la vitrina debe mostrar ocho medallas. «Archivo» ya no aparece. Cada medalla enseña
dos objetivos para su siguiente nivel y el progreso actual. Los emblemas son diseños geométricos
originales; no se incluyen insignias oficiales de Pokémon.

Los nuevos escalones son:

- Constancia: partidas y victorias.
- Victoria: victorias y porcentaje de victorias.
- Racha: racha máxima y partidas jugadas.
- Versatilidad: arquetipos y victorias.
- Viajera: torneos y mejor puesto.
- Top Cut: cortes y torneos.
- Championship: CP y cortes.
- Cronista: rondas con turno anotado y torneos.

## Cómo deshacerlo

**El código:** `git revert HEAD`.

**La base de datos:** no hay cambios que deshacer.
