# 05 · Cómo se calcula todo

Todas las fórmulas, con un ejemplo trabajado que puedes seguir con lápiz. Nada de esto se
guarda en la base de datos: **todo se deriva del historial de partidas en cada carga de página**.
Por eso puedes corregir una partida de hace tres meses y el ranking queda coherente solo.

El código está en **`src/lib/stats.ts`**, en funciones puras.

---

## El ejemplo que vamos a usar

Cuatro jugadores, liga a una vuelta, seis partidas Bo3:

| Partida | Resultado |
|---|---|
| Ibai – Marta | 2–1 Ibai |
| Ibai – Javi | 2–0 Ibai |
| Ibai – Nerea | 1–2 Nerea |
| Marta – Javi | 2–0 Marta |
| Marta – Nerea | 0–2 Nerea |
| Javi – Nerea | 2–1 Javi |

Que da esta clasificación:

| # | Jugador | PJ | V–E–D | Pts | %V | Res. | Dif. | Elo |
|---|---|---|---|---|---|---|---|---|
| 1 | Ibai | 3 | 2–0–1 | 6 | 66,7% | 44,44% | +2 | 1011 |
| 2 | Nerea | 3 | 2–0–1 | 6 | 66,7% | 44,44% | +2 | 1011 |
| 3 | Marta | 3 | 1–0–2 | 3 | 33,3% | 55,56% | −1 | 988 |
| 4 | Javi | 3 | 1–0–2 | 3 | 33,3% | 55,56% | −3 | 990 |

Vamos columna por columna.

---

## Partidas jugadas (PJ)

Cuenta **series**, no juegos. Un Bo3 que acaba 2–1 es **una** partida jugada, aunque se hayan
disputado tres juegos.

Solo entran las partidas con `status = "done"` y al menos un juego registrado. Las que están
`scheduled` (emparejadas pero sin resultado) no cuentan para nada.

---

## Victorias, empates y derrotas

El ganador de la serie es quien más juegos ganó. Si van igualados —solo posible con juegos
marcados como *empate / tiempo*— la serie es empate.

```
Ibai 2 juegos – Marta 1 juego  →  victoria de Ibai
Ibai 1 juego  – Nerea 2 juegos →  victoria de Nerea
```

Ganar 2–0 y ganar 2–1 valen exactamente lo mismo. Es la convención de los torneos oficiales: lo
que se puntúa es la serie.

---

## Puntos

```
Pts = victorias × pts_win + empates × pts_tie + derrotas × pts_loss
```

Con la puntuación por defecto (3 / 1 / 0):

```
Ibai:  2 × 3 + 0 × 1 + 1 × 0 = 6
Marta: 1 × 3 + 0 × 1 + 2 × 0 = 3
```

Los tres valores se cambian en *Ajustes*. Al hacerlo, la clasificación entera se recalcula en la
siguiente carga.

---

## Porcentaje de victorias (%V)

```
%V = (victorias + 0,5 × empates) / partidas jugadas
```

```
Ibai:  (2 + 0) / 3 = 0,667 → 66,7%
Marta: (1 + 0) / 3 = 0,333 → 33,3%
```

El medio punto por empate es la convención de Play! Pokémon, y es lo que hace que un empate no
sea equivalente a una derrota al calcular la resistencia.

---

## Resistencia

La media del porcentaje de victorias de tus rivales, **con un suelo del 25% por rival**.

```
resistencia = Σ máx(0,25 ; %V del rival) / número de rivales
```

Es el desempate a igualdad de puntos, y responde a la pregunta *"¿contra quién te ha tocado
jugar?"*. Dos jugadores con 6 puntos no están igual si uno se los ha sacado contra los dos
últimos y el otro contra los dos primeros.

Con el ejemplo:

```
Ibai:  (33,3% + 33,3% + 66,7%) / 3 = 44,44%   ← se enfrentó a Marta, Javi y Nerea
Marta: (66,7% + 33,3% + 66,7%) / 3 = 55,56%   ← se enfrentó a Ibai, Javi y Nerea
Javi:  (66,7% + 33,3% + 66,7%) / 3 = 55,56%
Nerea: (66,7% + 33,3% + 33,3%) / 3 = 44,44%
```

Marta y Javi tienen mejor resistencia que los dos primeros: han jugado contra rivales más
fuertes. Es exactamente lo que la métrica pretende capturar.

### El suelo del 25%

Un rival que ha perdido todas sus partidas cuenta como si hubiera ganado el 25%, no el 0%. Sin
ese suelo, haber jugado contra alguien que va 0–5 te hundiría la resistencia de forma
desproporcionada, y en un grupo pequeño donde todos se enfrentan a todos eso distorsiona mucho.
Es la regla oficial de Play! Pokémon.

### Lo que no está implementado

El reglamento oficial usa, en orden: puntos → **resistencia de los rivales** → **resistencia de
los rivales de tus rivales** → **enfrentamiento directo** → azar.

Arena ordena por: **puntos → %V → resistencia → diferencia de juegos → Elo**.

En el ejemplo, Ibai y Nerea empatan en todo hasta el Elo, y **Nerea ganó el enfrentamiento
directo**: con las reglas oficiales iría primera. Si esto os importa, el arreglo es añadir un
desempate por enfrentamiento directo en el `rows.sort(...)` de `standings()` en
`src/lib/stats.ts`.

---

## Diferencia de juegos

```
Dif. = juegos ganados − juegos perdidos
```

```
Ibai:  (2 + 2 + 1) − (1 + 0 + 2) = 5 − 3 = +2
Javi:  (0 + 0 + 2) − (2 + 2 + 1) = 2 − 5 = −3
```

Mide lo cómodas que han sido tus victorias. Es el último desempate antes del Elo.

---

## Elo

El sistema clásico de ajedrez, aplicado a la serie completa.

```
esperado_A = 1 / (1 + 10^((Elo_B − Elo_A) / 400))
Elo_A' = Elo_A + K × (resultado_A − esperado_A)
Elo_B' = Elo_B − K × (resultado_A − esperado_A)
```

Con `resultado_A` = 1 si gana A, 0 si gana B, 0,5 si empatan.

**Paso a paso, la primera partida.** Ibai y Marta empiezan los dos en 1000:

```
esperado_Ibai = 1 / (1 + 10^((1000 − 1000)/400)) = 1 / (1 + 10^0) = 0,5
Ibai gana → delta = 24 × (1 − 0,5) = +12
Ibai: 1000 + 12 = 1012        Marta: 1000 − 12 = 988
```

Tras las seis partidas: **Ibai 1011 · Nerea 1011 · Javi 990 · Marta 988**.

Tres propiedades que conviene tener claras:

1. **Es de suma cero.** Lo que uno gana, otro lo pierde. La suma de todos los Elo es siempre
   `número de jugadores × elo_start` (aquí 4 × 1000 = 4000). Si alguna vez no cuadra, hay un bug.
2. **Es global, no por competición.** Se calcula sobre **todas** las partidas de la liga en orden
   cronológico. Filtrar el ranking por competición no cambia el Elo, porque el Elo mide tu nivel
   en el grupo, no en un torneo concreto.
3. **Se recalcula entero cada vez.** No hay un valor acumulado en la base de datos. Corregir una
   partida de junio reajusta todo lo que vino después, como debe ser.

**El factor K** controla cuánto mueve una partida el rating. 24 va bien para un grupo pequeño que
juega poco: reacciona rápido sin ser errático. Bájalo a 16 si juegan mucho y quieres un ranking
más estable; súbelo a 32 si juegan poco y quieres que se mueva.

---

## Racha

Cuántas partidas seguidas llevas con el mismo resultado, contando desde la última hacia atrás:
`V3` son tres victorias seguidas, `D2` dos derrotas.

En el perfil se muestra además la **mejor racha de victorias** de toda tu historia, que se
calcula recorriendo el historial en orden y quedándose con la más larga (`longestWinStreak()`).

---

## Uso del metagame y rendimiento por arquetipo

Cada partida aporta **dos usos**: uno por cada lado. Con 41 partidas y todos los mazos
asignados, la suma de usos es 82.

```
%V del arquetipo = (victorias + 0,5 × empates) / veces que se llevó
```

En pantalla solo salen los arquetipos con **al menos 2 usos**: un 100% de una sola partida no
dice nada.

Las partidas sin mazo asignado **cuentan para el ranking y el Elo**, pero no para estas
estadísticas.

---

## Matriz de emparejamientos

Cada casilla responde: *"cuando mi mazo (fila) se ha enfrentado a ese otro (columna), ¿qué
porcentaje de veces he ganado?"*

Solo entran partidas donde **los dos** jugadores tienen mazo asignado. Cada una escribe dos
casillas simétricas: si Dragapult gana a Ogerpon, se anota una victoria en `Dragapult → Ogerpon`
y una derrota en `Ogerpon → Dragapult`. Por construcción:

```
%V(A contra B) + %V(B contra A) = 100%
```

Y el número de partidas de las dos casillas es idéntico. Si alguna vez no se cumple, hay un bug.

### El color

- Verde a partir del 55%, rojo por debajo del 45%, azul en medio.
- **La opacidad crece con el número de partidas**: `0,16 + n × 0,10`, tope 0,85.

Es a propósito. Un 100% de una sola partida se ve pálido y un 60% de doce partidas se ve sólido,
así que la matriz se lee de un vistazo sin caer en la trampa de las muestras pequeñas. Pasando el
ratón por una casilla te dice cuántas partidas hay detrás.

Se muestran como mucho **12 arquetipos**, los más jugados.

---

## Ventaja del primer turno

```
%  = juegos ganados por quien empezó / juegos con turno anotado
```

Se calcula sobre **juegos individuales**, no series, y solo entran los juegos donde alguien
rellenó el campo "Empezó". Los empates se descartan.

> Si solo anotáis quién empezó cuando os acordáis, el número sale sesgado: se tiende a anotar
> más las partidas memorables. O lo anotáis siempre, o mejor no mirar esta cifra.

---

## Cómo terminan las series

Cuenta cuántas series de cada formato acabaron con cada marcador: `Bo3 2–0`, `Bo3 2–1`,
`Bo5 3–2`… Si casi todos vuestros Bo3 son 2–1, el metagame está más igualado de lo que sugiere
la clasificación.

---

## Emparejamiento de rondas

`pairRound()` genera los cruces de la siguiente jornada. Primero decide el orden:

| Formato | Orden |
|---|---|
| **Liga** | El de los participantes |
| **Suizo** | Clasificación actual, de primero a último |
| **Eliminatoria** | 1º, último, 2º, penúltimo… (así el emparejamiento por parejas da 1º-último) |

Y luego empareja de forma voraz: coge al primero de la lista y lo cruza con **el primero que
tenga por delante contra el que no haya jugado ya**. Si todos son repetición, coge al siguiente
sin más. Con número impar, el último **descansa**.

> Es un algoritmo voraz, no óptimo: en teoría puede llegar a un punto donde los últimos dos son
> una revancha evitable. Con seis u ocho jugadores no pasa en la práctica, y a cambio el código
> se lee de una sentada. Los cruces se muestran **antes** de crear nada, así que si alguno no os
> convence siempre podéis registrar las partidas a mano.

**Rondas sugeridas** para un suizo: `⌈log₂(jugadores)⌉`. Seis u ocho jugadores → 3 rondas;
dieciséis → 4.

---

## Comprobarlo por tu cuenta

Las funciones son puras, así que se pueden ejecutar sin levantar la aplicación:

```bash
node --experimental-strip-types -e '
  import("./src/lib/stats.ts").then(s => {
    console.log("rondas para 8 jugadores:", s.suggestedRounds(8));
  })
'
```

Y el importador de listas:

```bash
node --experimental-strip-types -e '
  import("./src/lib/decklist.ts").then(d => {
    const p = d.parseDeckList("Pokémon: 2\n2 Dragapult ex TWM 130");
    console.log(p.total, d.suggestArchetype(p));
  })
'
```
