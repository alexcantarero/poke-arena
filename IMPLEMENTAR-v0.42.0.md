# PokeArena TCG v0.42.0 — calidad de los datos mostrados

Va sobre la **v0.41.0**. **Sin migración, sin dependencias, sin variables de entorno.**

Ninguna función nueva. Lo que ya había, enseñado mejor.

## Paso 1 — Descomprime

| | Fichero |
|---|---|
| M | `package.json` (0.42.0 y dos scripts nuevos), `CHANGELOG.md` |
| M | `CLAUDE.md`, `AGENTS.md` (regla de codificación) |
| M | `src/lib/format.ts` ← **el cambio central** |
| M | `src/components/charts/TrendLineChart.tsx` ← gráfica de actividad |
| M | `src/components/primitives.tsx`, `MulliganSim.tsx`, `UltimoRegional.tsx` |
| M | `src/components/TournamentRankingTable.tsx`, `RankingTodoTable.tsx` |
| M | `src/components/statistics/KPICards.tsx`, `src/app/(app)/torneos/[id]/page.tsx` |
| U | `src/lib/escala.ts`, `scripts/verificar-codificacion.mjs` |
| U | `tests/escala.test.ts`, `tests/formatoNumeros.test.ts` |

## Paso 2 — Borra lo que la v0.38 no llegó a quitar

```bash
git rm src/components/CompSelector.tsx src/components/LadderTimeline.tsx src/components/ui/toggle-group.tsx
```

Los documentos de la v0.38 sí se borraron; estos tres componentes no. Cero referencias.

## Paso 3 — Tu flujo, con un comando más

Desde ahora, en VS Code:

```bash
npm run verificar   # codificación + tests + tsc, en uno
npm run build
npm run dev
```

`npm run verificar` es lo que ya hacías (test y `tsc`) **más** la comprobación de codificación.
Esa es la única pieza nueva, y es la que habría parado el fallo del 9 de octubre: un texto
corrompido compila perfectamente, así que ni los tests, ni `tsc`, ni el build lo ven.

Si sale algo así:

```
✗ 1 línea(s) con texto corrompido por doble codificación:
  src/actions/index.ts:218  const bad = { error: "Correo o contraseÃ±a incorrectos." };
```

No lo arregles a mano: dime qué fichero es y lo reparo como el de la v0.41, que lo deja
exactamente como estaba.

## Paso 4 — Mira las pantallas

**Cualquier pantalla con porcentajes** (Ranking, Estadísticas, perfiles): tienen que salir con
coma, `54,3%`. Si ves alguno con punto, dime cuál; es un formateo a mano que se me escapó.

**Estadísticas → «Actividad diaria»**
- Arriba a la derecha, la cifra destacada es la **media de 7 días**, y al lado, pequeño, «hoy».
- Si hay un día con muchas más partidas que el resto, la gráfica ya no queda aplastada: debajo
  sale «Fuera de escala, para que se lean los demás días: 90 el 12 sept». Ese día sigue estando,
  solo que dicho en texto.

---

## Qué he cambiado, y por qué

### Los números, en español

`pct()` escribía `54.3%`, con punto decimal inglés, en una interfaz en español. Es el
formateador central, así que cambiarlo arregla las 59 pantallas que lo usan a la vez.

Además encontré **doce sitios que formateaban a mano** saltándose el central: el simulador de
mulligan tenía cinco porcentajes así, más el delta de las tarjetas, la media de la gráfica, las
medias del ranking y la cuota de entrada. Algunos ya ponían la coma con un `.replace`; otros
enseñaban el punto. Ahora todos pasan por el mismo sitio, y si algún día se cambia el formato,
cambia en toda la app.

**Dos cosas que parecen fallos y no lo son:**

- **`54,3%` va sin espacio.** La RAE recomienda el espacio antes de %, pero las tablas de
  ranking tienen columnas de ancho fijo donde «100,0 %» no cabe. Lo que faltaba era la coma.
- **«5453 listas» se queda así.** La norma española no separa los miles en números de cuatro
  cifras; el punto empieza en 10.000. Lo he comprobado, y está fijado en una prueba.

### La gráfica de actividad

En tu captura de Estadísticas el eje llegaba a 100 con una media de 2,7 partidas al día. El eje
no estaba fijado, así que el máximo era el día más alto, y **un solo día raro aplastaba los
otros 29** contra el suelo.

La solución estándar es recortar la escala por encima de lo normal **y decir lo que queda
fuera**. Ese «decir» es lo importante: una gráfica que esconde un valor sin avisar miente; una
que lo recorta y lo escribe debajo, no.

La regla está en `src/lib/escala.ts`, con pruebas. Y una de esas pruebas me corrigió: la primera
versión usaba el percentil 90, y con dos días disparados de doce los propios días raros ya eran
el 17 % de la serie y arrastraban el percentil hacia arriba, así que la regla dejaba de verlos.
Con el percentil 75 aguanta hasta un cuarto de días raros.

Y el chip dorado de arriba decía «Último: 0 partidas». El último punto es casi siempre **hoy**,
que casi siempre va a cero porque el día no ha acabado. Era lo primero que se leía de la gráfica
y no decía nada. Ahora destaca la media.

---

## Lo siguiente en calidad de datos (sin funciones nuevas)

Lo he visto auditando el código y lo dejo apuntado, por orden de lo que más se nota:

1. **Porcentajes sobre muestras diminutas.** En Inicio, «Tú: 0%» con una sola partida jugada
   se lee igual que un 0 % sobre cien. Hace falta una regla de muestra mínima por pantalla y
   enseñar el tamaño de la muestra al lado. Para hacerlo bien necesito saber qué pantallas miráis
   más: **mándame capturas de las tres que más uséis**.
2. **La gráfica de Elo con trece líneas**, que pediste sustituir. Sigue pendiente de que me pases
   el fichero donde vive «Cómo va la cosa»: no está en ningún zip que me hayas mandado.
3. **El modo inglés usa números españoles.** `pct` y `num` van fijos a `es-ES`. Como la
   traducción al inglés está a medias, no merece la pena todavía.
4. **Dos funciones de fecha corta** (`format.ts` y `ultimosCp.ts`) que hacen lo mismo de forma
   distinta. Unificarlas evita que dos pantallas escriban la misma fecha de dos maneras.

## Cómo deshacerlo

`git revert HEAD`. Nada toca la base de datos.
