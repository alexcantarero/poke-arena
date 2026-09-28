# Camino al corte y rondas del grupo — cómo enchufarlo

Va sobre el reglamento de verdad: **Play! Pokémon Tournament Rules Handbook, revisión del 1 de
septiembre de 2026**. Cada cosa que digo abajo lleva su sección.

---

## 1. El fallo gordo que había: el TCG no tiene una tabla de rondas, tiene tres

Esto es lo primero, porque afecta a números que la app ya estaba enseñando.

En §5.5.6 el reglamento asigna una variante distinta a cada tipo de torneo:

| Tipo de torneo | Variante | Qué es |
| --- | --- | --- |
| **League Challenge** | #2 — TCG Swiss Rounds Only | Suizo y se acabó. **Sin corte.** |
| **League Cup** | #3 — TCG Single Day | Suizo + eliminatoria el mismo día. |
| **Regional, Special, Internacional, Mundial** | #5 — Two Phase 2026 | Las dos fases. |

Y no dan lo mismo. Con **24 personas**:

| | League Challenge | League Cup | Regional |
| --- | --- | --- | --- |
| Rondas | **5** | **5** | **6** |
| Corte | ninguno | top 8 | top 4 asimétrico |

Si la app estaba aplicando la tabla de Regionales a todo, en una League Cup de 24 enseñaba una
ronda de más y un corte equivocado. Ya está corregido: `estructuraDe(jugadores, kind)` y
`umbralesDe(jugadores, kind)` piden el tipo de torneo.

Hay un test que lo deja fijado —«EL FALLO QUE ESTO CORRIGE»— para que no vuelva.

## 2. Lo que el reglamento confirma, y lo que añade

**Confirmado, sin cambios:** la tabla de dos fases (Variante #5) que te pasé la semana pasada es
exacta, fila por fila. Para 3.342 jugadores: 8+6 rondas, umbral de Día 2 en 16 puntos, top 8.
Y los match points son 3/0/1 (§5.3.2).

**Lo nuevo, y es importante:**

- **El corte asimétrico de TCG son 16 plazas.** Palabras suyas: *«The maximum number of
  competitors in an asymmetrical top cut is 16 for Pokémon TCG»* (§5.5.6.2). 32 es de VGC y GO.
  Confirma lo que te dije y descarta del todo el «top 32» de tu caja azul.
- **El orden de los desempates** (§5.5.2.1): primero el % de victorias de tus rivales, después
  el % de los rivales de tus rivales, y solo si empatan **exactamente dos**, el resultado
  directo entre ellos. En cuanto uno separa, los de abajo no se miran.
- **El % de victorias tiene suelo y techo** (§5.3.3.1), y esto casi nadie lo sabe: el suelo es
  **25%** —quien perdió todas cuenta como 25, no como 0— y el techo es 100% si terminó el
  torneo pero **75% si se retiró**. O sea: **que un rival tuyo se vaya a casa te hunde la
  resistencia**. Está implementado en `winPercentage()`, con los ejemplos del propio reglamento
  como test.
- **Un bye cuenta como victoria en el récord pero no como ronda jugada** para la resistencia
  (§5.6.1). Y nadie recibe más de un bye por torneo.
- **Los CP no están en este documento.** El reglamento solo dice (§4.6.2) que el reparto depende
  del tipo de evento y del número de participantes; las tablas van en un recurso aparte. Así que
  las tablas de `cp.ts` no las he podido contrastar contra esto. Lo que sí confirma es la regla
  del kicker por asistencia, que ya está bien implementada.

Un detalle que conviene tener presente: §5.1.3 dice que **la temporada de divisiones de edad
empieza el 1 de septiembre**, mientras que la de CP va de julio a junio. Son dos calendarios
distintos y `seasonOfDate` implementa el de CP, que es el bueno para lo que hace la app.

---

## 3. `CaminoAlCorte.tsx` — sustituye a `CutOutlook`

**Qué cambia respecto a lo que tenías:**

- **Dos números, no seis.** Fuera la entrada segura, la burbuja y la lista de finales posibles.
  Quedan **el mínimo para pasar de fase** y **el mínimo para pelear el corte**, que son los dos
  únicos que cambian lo que haces. Si vas justo tienes que ganar; saber que existe un récord más
  cómodo no te hace jugar distinto.
- **Tres pestañas**: Día 1, Día 2 y corte, General. El Día 1 solo habla del Día 1 — en la ronda
  4 no le importa a nadie el 12-2.
- **Se pliega**, y cerrado la cabecera sigue diciendo lo urgente: «13 pts · gana 1 más para el
  Día 2».
- **dentro / depende / fuera**, y estar justo en el mínimo del corte es **depende**, nunca
  dentro. En la pestaña del Día 1 no hay «depende» porque el umbral de fase es absoluto.
- Avisa si la asistencia apuntada no cuadra con las rondas configuradas, que es el error de dedo
  que descoloca todos los números.

**Cómo se enchufa.** En `torneos/[id]/page.tsx`, cambia el import y pásale las rondas:

```tsx
import { CaminoAlCorte } from "@/components/CaminoAlCorte";

<CaminoAlCorte
  kind={t.kind}
  playerCount={t.playerCount}
  rondasTotales={t.rounds}      // lo configurado a mano manda sobre la tabla
  topCut={t.topCut}
  storageKey={`torneo-${t.id}`} // para que recuerde el plegado por torneo
  rondas={misRondas.map((m) => ({
    round: m.round,
    result: ganó(m) ? "w" : empató(m) ? "t" : "l",
  }))}
/>
```

Lo único que hay que darle son las rondas con su número y su resultado; él solo las parte en
Día 1 y Día 2 con la tabla del reglamento.

---

## 4. `RondasDelGrupo.tsx` — las rondas de todos, plegables

Tú sales **primero y abierto**; los demás cerrados, ordenados por puntos. Cerrado, cada bloque
ya dice nombre, mazo, récord y puntos, que es lo que se mira de reojo; se abre para ver las
catorce rondas con rival, mazo, marcador, quién salió primero y la nota.

Hay un «Abrir todo / Plegar todo» arriba, y las rondas de Día 2 van marcadas solas a partir de
`fase1`: no hay que etiquetarlas a mano como estabas haciendo.

**El formulario de añadir va dentro de tu bloque, al final.** Apuntar la ronda 9 y mirar la 8
son la misma tarea, y tenerlas en pantallas distintas obliga a ir y volver, de pie y con el
móvil. Entra como prop porque habla con una Server Action y esto es cliente:

```tsx
import { RondasDelGrupo } from "@/components/RondasDelGrupo";
import { spriteUrl } from "@/lib/pokemon";

<RondasDelGrupo
  yoId={me.id}
  fase1={estructura?.fase1 ?? t.rounds ?? 0}
  total={t.rounds ?? 0}
  sprite={spriteUrl}
  jugadores={participantes.map((p) => ({
    id: p.id, name: p.name,
    mazo: p.mazoNombre, main: p.main, secondary: p.secondary,
    wins: p.wins, losses: p.losses, ties: p.ties,
    puntos: p.wins * 3 + p.ties,
    placement: p.placement,
    rondas: p.rondas.map((r) => ({
      round: r.round, rival: r.rival, mazoRival: r.mazoRival,
      main: r.main, secondary: r.secondary,
      ganados: r.ganados, perdidos: r.perdidos,
      primero: r.primero, nota: r.nota,
      editar: <BotonEditar id={r.id} />,   // lo tuyo, tal cual
    })),
  }))}
  formulario={<TuFormularioDeRonda torneo={t} />}
/>
```

`sprite` y `editar` entran inyectados para que el componente no dependa de `pokemon.ts` ni de
tus acciones. Si no se los pasas, simplemente no pinta sprites ni botón de editar.

---

## 5. Qué hay en el zip

**Módulos** (puros, sin imports, los tests los cargan directos):

| Fichero | Tests |
| --- | --- |
| `src/lib/estructura.ts` — las tres tablas, los dos umbrales, desempates y % de victorias | 28 |
| `src/lib/metaBadges.ts` — las insignias del meta | 19 |
| `src/lib/metaGrupo.ts` — vuestros resultados con la forma de los de fuera | 17 |

**Componentes** (nuevos, no pisan nada):

- `src/components/CaminoAlCorte.tsx`
- `src/components/RondasDelGrupo.tsx`

`npm test` → **221**.

### Un cambio que te afecta si ya usabas `metaGrupo`

`ResultadoGrupo` ya no lleva `playerCount` + `kind`: lleva **`umbralDiaDos`**, que calculas tú
en una línea antes de llamar:

```ts
umbralDiaDos: umbralesDe(t.playerCount, t.kind)?.diaDos?.puntos ?? null
```

No es un capricho. Al importar `estructura.ts` desde `metaGrupo.ts` hacía falta poner la
extensión `.ts` para que los tests lo cargasen, y **esa extensión rompe `npm run build`**. O sea:
el import que hacía pasar los tests era el que reventaba la compilación. Lo pillé en la
comprobación de tipos antes de mandártelo; es exactamente el mismo tipo de fallo que se nos
coló en la v0.9.0. La salida es la de siempre aquí: estos módulos no importan nada y lo que
necesitan entra por parámetro.

---

## 6. Lo que sigo necesitando

Sigo sin poder tocar tu inicio ni tu pantalla de torneo: **el repo no está en el portátil de
Luce**. Lo busqué en todo `C:\Users` y `D:` y no hay ninguna carpeta del proyecto ni ningún
`drizzle.config.ts`; lo único parecido son dos zips de principios de septiembre.

Los dos componentes de arriba están hechos para que puedas enchufarlos tú sin que yo vea nada
más, porque reciben todo por props. Pero para la parte que sí pediste y no puedo hacer a ciegas
—reordenar el inicio y mover las estadísticas de jugadores a su pestaña— necesito el código.

Con mandarme `src/` en un zip me sobra.
