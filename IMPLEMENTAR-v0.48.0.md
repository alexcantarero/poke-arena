# PokeArena TCG v0.48.0 — el inglés: medirlo, verlo e Inicio entero

Va sobre la **v0.47.0** (que lleva migración: aplícala antes si no lo has hecho).
**Esta no lleva migración ni dependencias.**

## Paso 1 — Descomprime y verifica

| | Fichero |
|---|---|
| M | `package.json`, `CHANGELOG.md` |
| M | `src/lib/i18n.ts`, `src/lib/lang.ts` |
| M | `src/app/(app)/page.tsx`, `src/app/(app)/layout.tsx`, `src/components/UltimoRegional.tsx` |
| M | `tests/i18n.test.ts` |
| U | `scripts/verificar-i18n.mjs` |

```bash
git rm IMPLEMENTAR-v0.47.0.md   # cuando la hayas aplicado
npm run verificar   # ahora incluye el control de traducción
npm run build
```

## Paso 2 — Mira el inglés en tu PC

En producción **no cambia nada**: todo el mundo sigue viendo la app en español.
Para verlo tú en local:

```bash
# Windows (PowerShell)
$env:ARENA_INGLES="1"; npm run dev

# macOS / Linux
ARENA_INGLES=1 npm run dev
```

Aparece el botón EN en la barra. Púlsalo y mira **Inicio**: tiene que estar entero en inglés,
incluidos los días de la semana («Mon»), «in 3 days», «3rd place» y las insignias de «The latest
Regional». Las demás pantallas siguen en español: es lo esperado.

## Paso 3 — Mira cuánto falta

```bash
npm run verificar:i18n            # los 15 ficheros con más texto
npm run verificar:i18n -- --todos # todos
```

---

## Por qué no está todo el inglés en esta versión

Antes de empezar lo medí, y es mucho más de lo que parece: **unos 878 textos repartidos en 89
ficheros**, más los avisos que da el servidor al guardar. Había 64 traducidos.

Traducirlo todo de una vez serían cambios en casi cien ficheros a la vez, sin poder lanzar el
build desde aquí, en un trabajo donde cada error se ve en pantalla. Si algo se rompiera, sería
muy difícil saber dónde. Así que he hecho lo que deja el resto rápido y seguro:

1. **Un medidor**, para que «el inglés está completo» sea un dato. Y con `--estricto` dentro de
   `npm run verificar`, una pantalla traducida ya no puede volver a medias sin que salte.
2. **Una forma de verlo en tu PC** (`ARENA_INGLES=1`) sin que nadie vea una app a medias.
3. **Inicio traducido entero**, que es la pantalla que abre todo el mundo, y con eso el método
   probado: los huecos para números, los ordinales en inglés (1st, 2nd, 3rd… y la excepción de
   11th, 12th y 13th), los días de la semana y las fechas.

Al hacerlo encontré que el propio medidor tenía un punto ciego: no veía los textos que ocupan
varias líneas, y por eso la primera cifra salió en 778. La real es 878. Lo arreglé antes de
entregarlo.

## El plan para terminarlo

Con el medidor delante, en tandas de entre 140 y 220 textos:

| Versión | Qué | Textos |
|---|---|---|
| **0.49** | Componentes comunes y perfil/cuenta: salen en todas las pantallas, es lo que más se nota | ~140 |
| **0.50** | Partidas, mazos, liga y calendario | ~210 |
| **0.51** | Torneos | ~185 |
| **0.52** | Estadísticas, ranking y top decks | ~220 |
| **0.53** | Ajustes y los avisos del servidor, y **se enciende para todos** | ~120 + avisos |

Cada tanda añade sus pantallas a la lista de traducidas del medidor, así que lo que se termina no
puede volver atrás.

## Lo demás que estaba pendiente

- **Tu %V en Inicio con muy pocas partidas.** Lo marqué en la v0.42: «Tú: 0 %» tras una sola
  derrota se leía igual que un 0 % sobre cien. Ahora, por debajo de 5 partidas, sale un guion y
  cuántas faltan.
- **«Cómo va la cosa»** (el bloque de la pestaña Elo que pediste cambiar en la v0.38): sigue sin
  existir en el código. Si es otra pantalla, mándame una captura.
- **Dos dependencias sin uso** desde la v0.43: `npm uninstall class-variance-authority radix-ui`.
- **Ciphermaniac**: sigue pendiente de que les escribas por su formulario.

## Cómo deshacerlo

`git revert HEAD`. No toca la base de datos.
