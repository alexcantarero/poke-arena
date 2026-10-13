# PokeArena TCG v0.33.0 — cómo aplicarla

Va sobre la **v0.32.0**.

> **No lleva migración de base de datos.** No añade dependencias ni variables de entorno.

## Paso 1 — Actualiza el código

Integra los cambios de la v0.33.0 respetando las rutas del repositorio.

## Paso 2 — Verifica

```bash
npm test
npx tsc --noEmit
npm run build
```

## Paso 3 — Comprueba los rankings

- Inicio y competiciones ya no muestran la cifra de puntos de cada jugador o equipo.
- En los rankings, los puntos siguen determinando el orden inicial y los desempates.
- En móvil, el detalle de la liga ya no repite bajo cada jugador las métricas mostradas en columnas.
- «Ranking Liga» es el encabezado de la clasificación de la competición.
- Los Championship Points y los umbrales de torneos siguen visibles donde corresponda.

## Cómo deshacerlo

**El código:** revierte el commit de la v0.33.0 tras revisar los cambios incluidos en él.

**La base de datos:** no hay cambios que deshacer.
