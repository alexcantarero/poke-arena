# Inglés completo — progreso de la v0.49

Una sola versión con todo el inglés. Se construye en varias tandas y se entrega
**un único zip** cuando `npm run verificar:i18n` marque cero.

## Punto de partida (medido)

- ~878 textos sin traducir en 89 ficheros (más los avisos de las Server Actions).
- 329 en 39 componentes de cliente → `const L = useLang();` en la PRIMERA línea.
- 549 en 50 componentes de servidor → `const lang = await getLang();`.

## Reglas

1. Cliente: `useLang()` siempre en la primera línea del componente, antes de
   cualquier `return`. Un hook detrás de un return condicional rompe React en el
   navegador y no lo ven ni `tsc` ni los tests.
2. Cada clave en `ES` y en `EN` (el tipo obliga: si falta en inglés, no compila).
3. Cada pantalla terminada entra en `TRADUCIDAS` de `scripts/verificar-i18n.mjs`.
4. Solo se enciende para todos (`INGLES_DISPONIBLE = true`) con el medidor a cero.

## Tandas

| | Zona | Textos | Estado |
|---|---|---|---|
| 0 | Base: `LangProvider` + `useLang()` en el layout raíz | — | hecho |
| 1–4 | **Todo el texto de JSX de la app**, automatizado: 136 ficheros-pasada, 924 sustituciones, 758 claves | ~857 | **hecho** |
| 5 | Ajustes, avisos del servidor y encender | ~120 + avisos | pendiente |

## Estado tras la tanda 1–4 (automatizada)

- Medidor: de ~878 a **~21 textos en 7 ficheros**. `tsc` limpio, 521 tests.
- 46+ `useLang()` insertados, todos en la primera línea de su componente.
- Scripts en `/tmp/i18n/` (inventario, aplicador, traducciones por número).

## Lo que falta para encender el inglés

1. **Componentes compartidos cliente/servidor** (`ui.tsx`, `KPICards.tsx`): no
   pueden usar ni `useLang()` ni `getLang()`. Necesitan otra solución.
2. **Textos en el código, no en JSX**: ternarios, constantes, plantillas
   (`` `${n} jugadores` ``). El medidor no los cuenta.
3. **Avisos de las Server Actions** (`withFlash(..., "Partida guardada.")`).
4. **Textos que generan las librerías** (`explainCp`, `reglaDePaso`…) y las fechas
   o números con `es-ES` fijo.
5. Encender: `INGLES_DISPONIBLE = true`.

## v0.49 entregada

- JSX, cadenas del código y avisos del servidor: traducidos. 113 ficheros blindados.
- Encendido para todos (`INGLES_DISPONIBLE = true`).
- Pendiente para una v0.50: ~134 frases con valores dentro, textos en constantes y valores por
  defecto, 7 de `ui.tsx`, formatos de número y fecha en inglés, 2 avisos por trozos.
