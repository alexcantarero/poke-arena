# Lo de hoy

## 1. El formato de standings de Frankfurt: ya funciona

Las tres líneas que me pasaste entran tal cual. El parser las lee bien a pesar de las dos
trampas que tiene ese formato respecto al de Limitless online:

- **El mazo va detrás de los porcentajes**, no delante del récord.
- Entre el nombre y el récord hay un número suelto —los match points— que podría confundirse
  con un puesto.

```
1 Tomasz Chałupka PL 49 16 - 1 - 1 62.22% 62.84% alakazamdusknoir
→ { placement: 1, deck: "Alakazam Dusknoir", wins: 16, losses: 1, ties: 1 }
```

Tres tests nuevos lo dejan fijado, y uno de ellos comprueba que **de ahí no sale ni un nombre ni
una nacionalidad**: busca «Tomasz», «Chałupka», «Etxebarria», «PL», «ES» en el resultado
serializado y falla si aparece alguno. La nacionalidad también es un dato de la persona.

Una cuenta que sirve de doble comprobación: 16 victorias y 1 empate son 49 puntos, que es
exactamente lo que dice su columna. Si el 49 se hubiera colado como récord o como puesto, no
cuadraría. Hay un test para eso.

## 2. Día 1 y Día 2: ahora el récord también se parte

`RondasDelGrupo` tiene tres pestañas —Todo, Día 1, Día 2— y al cambiar **no solo se filtran las
rondas: el récord de cada jugador se recalcula sobre las que se están mirando**. Que era justo
tu ejemplo: Ibai acaba el Día 1 en 5-2-1 y el Día 2 en 2-4-0, en vez de salir con el 9-3-2 del
torneo entero encima de cinco rondas.

Dos detalles que van con ello:

- **El puesto se esconde dentro de una fase.** Enseñar «#410» junto al récord del Día 2 daría a
  entender que hubo una clasificación de esa fase, y no la hay: el puesto es del torneo.
- **La etiqueta «Día 2» de cada fila desaparece** cuando ya estás filtrando por Día 2, porque
  repite lo que dice la pestaña.

El selector solo sale si el torneo tiene dos fases. En una League Cup no pinta nada.

## 3. «Top arquetipos» no es del último Regional

Tienes razón en que confunde, y el número lo confirma: ese panel dice **21 resultados en 9
torneos, temporada 2027**, o sea vuestro histórico. El de arriba es un evento suelto con 3.342
jugadores. Son dos cosas distintas pegadas una debajo de otra.

Lo que yo haría, por orden de cuánto arregla:

1. **Separarlo con un título de sección de verdad**, no con una tarjeta más. Algo como
   **«Vuestro metagame»** con su subtítulo «21 resultados en 9 torneos · temporada 2027», y un
   hueco en blanco claro entre los dos bloques.
2. **Cambiar el color del acento.** El bloque del Regional va en azul de fuente externa y este
   en el color de la liga. Si los dos van en el mismo, se leen como uno.
3. **Ponerle el filtro de temporada visible**, ya que el dato lo tienes. «Temporada 2027» en
   pequeño no basta cuando el bloque de arriba es de un fin de semana concreto.

Eso no lo puedo tocar yo sin tu código.
