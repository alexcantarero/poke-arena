# PokeArena TCG v0.38.0 — arreglo del build, limpieza y reorganización

Va sobre la **v0.37.0**. **Sin migración, sin dependencias, sin variables de entorno nuevas.**

> **Lo primero: el build estaba roto.** Esta versión lo arregla. Lánzalo antes que nada.

## Paso 1 — Descomprime

| | Fichero |
|---|---|
| M | `package.json`, `CHANGELOG.md` |
| M | `src/app/(app)/estadisticas/page.tsx` ← **el arreglo del build** |
| M | `src/app/(app)/calendario/page.tsx` |
| M | `src/app/(app)/perfil/[id]/page.tsx` |
| M | `src/app/(app)/topdecks/page.tsx` |
| M | `src/components/H2HHeatmap.tsx`, `src/components/Nav.tsx`, `src/components/icons.tsx` |
| M | `src/lib/nav.ts` |
| U | `src/components/SeccionPlegable.tsx` |
| U | `src/components/UltimosCp.tsx` |
| U | `src/lib/ultimosCp.ts` |
| U | `tests/ultimosCp.test.ts` |

## Paso 2 — Borra lo que sobra

```bash
git rm src/components/CompSelector.tsx src/components/LadderTimeline.tsx \
       src/components/ui/toggle-group.tsx
git rm LEEME.md CAMBIOS-DE-HOY.md ESTRUCTURA-2026.md
git rm IMPLEMENTAR-v0.3*.md
```

Los tres componentes no tenían **una sola referencia** en todo el repositorio. Los documentos
sueltos eran notas de sesiones concretas y guías ya aplicadas; lo que valía de ellas está en
`CHANGELOG.md` y en `docs/`.

**`src/lib/utils.ts` se queda** aunque tampoco lo use nadie: `components.json` lo declara como
el helper de shadcn, y borrarlo rompería el próximo `npx shadcn@latest add`.

## Paso 3 — Verifica

```bash
npm test          # 436 de 436
npx tsc --noEmit
npm run build     # esto es lo que importa en esta versión
```

---

## Qué he arreglado

### El build

`estadisticas/page.tsx` no compilaba: «Expected '</', got ';'». Al reorganizar las tres
tarjetas de abajo (series, primer turno, actividad) dentro de la rejilla de tres columnas se
perdieron **dos cierres de fragmento** con su `)}`: los que cerraban `{conLocal && (<>` y la
rama `else` del ternario de la fuente.

Por eso el compilador señalaba la línea 694, que es donde se acaba el fichero: cuando falta un
cierre, el error aparece al final, no donde está el fallo. Si vuelve a pasar, el truco es
contar los `<>` y los `</>` del fichero; tenían que ser siete y había cinco.

### Los números que no se veían

El récord de debajo del porcentaje, en la matriz de enfrentamientos, iba a 10 px con
`text-muted`. Ese gris está calculado para el fondo de la tarjeta, no para una celda teñida de
verde o de rojo: sobre el tinte se quedaba casi al nivel del fondo. Ahora hereda el color del
texto de la celda y se separa con opacidad, que mantiene el contraste sea cual sea el tinte, y
sube a 11 px.

## Qué he cambiado

**El calendario ya no pinta partidas.** Cada jornada metía veinte líneas de «Ibai 1–2 Alex» que
tapaban los torneos, que es lo único que hay que planificar. Quedan torneos y eventos
oficiales. El historial ya tiene su pantalla con filtros y paginación.

**Emparejamientos del perfil: mínimo 5 partidas.** Con dos cruces el porcentaje solo puede ser
0, 50 o 100. Una lista llena de «100% (2)» parece información y es ruido.

**«Mazos» sale del menú lateral y entra en Top Decks.** El momento en que uno quiere abrir su
biblioteca es justo después de mirar qué se está jugando: ves el metagame, decides con qué ir,
y lo siguiente es tu mazo. Como dos entradas gemelas en el menú obligaba a elegir antes de
saber qué había en cada una.

La ruta `/mazos` **no cambia**. `NavItem` tiene ahora un `oculto?` y la sección sigue en
`NAV_ITEMS`, que es la lista con la que se resuelve el título de la cabecera: sacarla de ahí
habría dejado la pantalla de mazos sin nombre.

**El perfil se pliega.** `SeccionPlegable` recuerda en `localStorage` qué dejaste cerrado, que
es lo que separa un plegable útil de un clic más en cada visita. Aplicado a «Enfrentamientos
directos» y «Emparejamientos».

---

## Lo que NO he podido hacer, y por qué

**La pestaña del Elo de «Cómo va la cosa» no existe en el código que me has mandado.** He
buscado «Cómo va la cosa», «Metajuego» y los tres gráficos (`EloChart`, `MetaChart`, `CpChart`)
en todo `src/`: el bloque no está, y los tres gráficos no los importa nadie. Tu captura es de
una versión que no está en este zip.

Así que te dejo **el sustituto hecho y listo para enchufar**, props-only:

```tsx
import { UltimosCp } from "@/components/UltimosCp";
import { ultimosConCp } from "@/lib/ultimosCp";

// donde hoy va la pestaña del Elo:
<UltimosCp filas={ultimosConCp(entradas, 5)} />
```

`entradas` es un array con `{ id, torneoId, torneo, fecha, tipo, jugadorId, jugador, puesto,
cp }`, uno por resultado de torneo. **Los CP los calcula `lib/cp.ts`** con `effectiveCp()`, y
se pasan ya calculados: dos sitios calculando CP es exactamente el fallo de la v0.9.0, donde
unas pantallas leían la columna en crudo y otras recalculaban.

El módulo filtra los que puntuaron de verdad (`cp > 0`), ordena por fecha y desempata por CP, y
corta en cinco. Un resultado a cero no entra a propósito: puede ser un torneo que no da CP, un
puesto fuera de tramo o una asistencia sin rellenar, y las tres se leerían como «fue y no sacó
nada».

Si me pasas el fichero donde está ese bloque, lo enchufo yo y te lo devuelvo cableado.

**«Ordenar cosas del perfil»** lo he entendido como plegar y recordar, que es lo que he hecho.
Si lo que querías es **reordenar las secciones arrastrándolas**, dímelo: es otra cosa y lleva
guardar el orden por usuario.

---

## Cómo deshacerlo

`git revert HEAD`. Nada toca la base de datos.

Si solo quieres recuperar las partidas en el calendario, el bloque está en el `git diff` de
`calendario/page.tsx` y son doce líneas.
