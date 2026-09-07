# 02 · Manual de usuario

Cómo se usa Arena, pantalla por pantalla. Escrito para cualquiera del grupo, no solo para quien
lo mantiene.

**Índice**

- [Entrar](#entrar)
- [La barra lateral](#la-barra-lateral)
- [Inicio](#inicio)
- [Mazos](#mazos) — *el primer sitio al que ir*
- [Registrar una partida](#registrar-una-partida)
- [Competiciones](#competiciones)
- [Ranking](#ranking)
- [Resultados](#resultados)
- [Calendario](#calendario)
- [Estadísticas](#estadísticas)
- [Perfil](#perfil)
- [Ajustes](#ajustes)
- [Preguntas frecuentes](#preguntas-frecuentes)

---

## Entrar

La primera vez que alguien abre la web ve la pantalla de acceso:

1. **Código de invitación** — el que os habéis repartido. Solo aparece si la liga tiene código
   configurado.
2. **¿Quién eres?** — pulsa tu nombre en la lista.
3. Si tu jugador tiene **PIN**, aparece un campo extra para teclearlo.
4. **Entrar**.

La sesión se guarda en una cookie firmada que dura **180 días**, así que en tu móvil o tu
portátil solo lo haces una vez. Cada dispositivo va por su cuenta: si entras desde el móvil,
tendrás que identificarte también ahí.

Para **salir o cambiar de jugador**, pulsa tu nombre abajo del todo en la barra lateral.

> El código de invitación es lo único que separa vuestra liga de internet. No es una
> contraseña por persona: cualquiera que lo tenga puede entrar y elegir ser quien quiera. Si os
> importa, poned un PIN a cada jugador desde *Ajustes*.

---

## La barra lateral

Nueve secciones, siempre visibles. En móvil se convierten en una barra de pestañas abajo.

Debajo del todo hay dos cosas fijas: el botón **Registrar partida**, que es la acción que más
vas a usar, y tu nombre, que sirve para salir.

---

## Inicio

El resumen de la liga:

- **Cuatro cifras arriba**: partidas jugadas, quién lidera la competición principal, el
  arquetipo más jugado del grupo y tu propio porcentaje de victorias.
- **Próximas fechas**: los siguientes eventos del calendario.
- **Clasificación**: el top 6 de la liga en curso.
- **Partidas pendientes**: los emparejamientos generados que aún no tienen resultado. Cada uno
  con su botón para anotarlo. *Solo aparece si hay alguno.*
- **Últimos resultados**: las seis últimas partidas.
- **Arquetipos más jugados** y **% de victorias por arquetipo**.

---

## Mazos

**Es el primer sitio al que ir.** Sin mazos registrados puedes anotar partidas, pero se pierden
todas las estadísticas de metagame: no hay matriz de emparejamientos, ni winrate por arquetipo,
ni "qué llevabas cuando ganaste".

### Crear un mazo

*Mazos → + Mazo*. Tres bloques:

**1. Jugador y nombre.** El nombre es libre y solo lo ves tú en las listas: "Dragapult control",
"el de Javi que no pierde nunca".

**2. Arquetipo — esto es lo importante.**

El arquetipo es lo que agrupa **todas** las estadísticas. Se define con:

- **Pokémon principal** — el que da nombre al mazo: `dragapult`, `raging-bolt`, `excadrill-mega`.
- **Pokémon secundario** — opcional, el acompañante: `ogerpon`, `dudunsparce`.
- **Tipo** — solo sirve para el color del icono cuando no hay sprite.

Escribe los nombres como quieras: "Mega Excadrill ex", "N's Zoroark ex" o "Raging Bolt". La web
los normaliza sola al identificador que usa Limitless (`excadrill-mega`, `zoroark`,
`raging-bolt`) y así los sprites salen correctos.

Debajo verás una **vista previa** con los sprites y el nombre resultante. Si sale un cuadro
vacío en vez del Pokémon, el identificador no coincide con el de Limitless: corrígelo. Las
estadísticas funcionan igual aunque el sprite falle, solo es cosmético.

Si otro jugador ya usa ese arquetipo, aparece en el desplegable **"O reutiliza uno existente"**.
Úsalo: así los dos mazos cuentan como el mismo arquetipo en la matriz de emparejamientos, que
es justo lo que quieres.

**3. Lista completa (opcional).**

Pega aquí las 60 cartas. De dónde sacarlas:

- **Pokémon TCG Live** → abre el mazo → botón **Exportar** → se copia al portapapeles.
- **Limitless** → en el constructor de mazos, **Compartir → Copiar como texto**.
- También se entiende el formato antiguo de **PTCGO** (el de `##Pokémon - 13` y `* 3 Carta SET 12`).

Al pegarla, la web:

- La interpreta y te enseña las tres secciones separadas (Pokémon, Entrenador, Energía) con sus
  cuentas.
- Valida que sumen **60 cartas** y que no haya más de **4 copias** de ninguna carta que no sea
  energía básica. Si algo no cuadra, te lo dice en rojo — es un aviso, no te impide guardar.
- Te ofrece un botón **"Usar Dragapult"** que rellena solo el arquetipo a partir de la lista.

Ese botón mira solo cartas *ex*, *V*, *VMAX*, *VSTAR* y *Mega*, para que una línea evolutiva
completa (Dreepy → Drakloak → Dragapult ex) no te proponga "Dreepy" como Pokémon secundario.

La lista queda guardada y se puede consultar después desde el detalle de cualquier partida en la
que se usara ese mazo.

### La tabla de arquetipos

Abajo de la pantalla está el catálogo de arquetipos del grupo, con cuántas partidas se ha jugado
cada uno. Se llena solo según vais registrando mazos, y trae de serie los 20 arquetipos del
metagame Standard actual.

---

## Registrar una partida

El botón dorado, disponible desde cualquier pantalla. Cuatro bloques:

**1. Contexto.** Competición (o "Amistoso suelto"), fecha y número de jornada.

**2. Formato.** Bo1, Bo3 o Bo5. Debajo te recuerda a cuántos juegos se gana: Bo3 → 2, Bo5 → 3.

**3. Los dos jugadores y sus mazos.** Al elegir jugador, el desplegable de mazo se filtra solo
con los suyos. Si aún no tiene mazos, déjalo en "sin asignar": la partida cuenta igual para el
ranking, solo se pierde para las estadísticas de metagame.

**4. Resultado juego a juego.** Una fila por juego:

- **Ganador**: uno de los dos jugadores, o *Empate / tiempo*.
- **Empezó**: quién hizo el primer turno. Es opcional, pero es lo único que alimenta la
  estadística de ventaja del primer turno. Si vais a anotarlo, anotadlo siempre; si solo lo
  anotáis a veces, el porcentaje sale sesgado.

Las filas que sobran se apagan solas: en un Bo3 que va 2-0, el tercer juego se atenúa y se
bloquea. El marcador de arriba se actualiza en vivo.

El botón **Guardar** no se activa hasta que alguien llega al número de juegos necesario. Si te
falta, te lo dice: *"Faltan juegos: nadie llega a 2"*.

### Corregir una partida

Cualquier partida se puede editar o borrar: entra en ella desde *Resultados* → **Ver**, y abajo
tienes el mismo formulario. Al guardar, **el ranking, el Elo y todas las estadísticas se
recalculan enteros** desde el historial: no hay acumulados que queden desfasados. Puedes
corregir una partida de hace tres meses sin miedo.

---

## Competiciones

Cuatro formatos:

| Formato | Cómo empareja |
|---|---|
| **Liga** (todos contra todos) | Genera los cruces que aún no se han jugado. |
| **Suizo** | Ordena por clasificación y empareja de arriba abajo, saltando los cruces repetidos mientras pueda. |
| **Eliminatoria** | 1º contra último, 2º contra penúltimo, según la clasificación actual. |
| **Amistosos** | No empareja: es un cajón para las partidas sueltas. |

### Crear una

*Competiciones* → formulario al final de la página. Nombre, formato, fechas, formato de serie
por defecto y **participantes** (pulsa los nombres para incluirlos o quitarlos).

En un suizo aparecen además **rondas** —te sugiere el número habitual según cuántos jugadores
haya, `log₂(n)` redondeado hacia arriba— y **top cut**.

### Jugar una jornada

Entra en la competición. En la tarjeta **Jornada N** ves los cruces propuestos antes de crear
nada. Si algún cruce ya se jugó, sale marcado. Con un número impar de jugadores, uno **descansa**.

Pulsa **Crear N partidas pendientes** y aparecen en la lista de al lado, y también en *Inicio* y
*Resultados*. Cada una con su botón **Anotar** para meter el resultado.

---

## Ranking

La clasificación completa. **Pulsa cualquier cabecera para reordenar** por esa columna.

| Columna | Qué es |
|---|---|
| **PJ** | Partidas jugadas (series, no juegos) |
| **V–E–D** | Victorias, empates, derrotas |
| **%V** | (victorias + medio empate) / partidas |
| **Pts** | Según la puntuación configurada en Ajustes |
| **Elo** | Rating global de toda la liga |
| **Res.** | Resistencia: media del %V de tus rivales, con suelo del 25% |
| **Dif. juegos** | Juegos ganados menos juegos perdidos |
| **Racha** | V3 = tres victorias seguidas, D2 = dos derrotas |
| **Mazo habitual** | El arquetipo que más ha llevado en esta competición |

Arriba a la derecha eliges si miras **Global** (todas las partidas) o una competición concreta.
El **Elo es siempre global**: no cambia al filtrar, porque mide tu nivel en la liga entera.

Abajo, la **evolución del Elo** de cada jugador en una gráfica pequeña.

Las fórmulas están explicadas con ejemplos en **[05 · Cómo se calcula todo](05-estadisticas.md)**.

---

## Resultados

Todas las partidas, de la más reciente a la más antigua, con cuatro filtros combinables:
competición, jugador, arquetipo y formato.

Cada fila muestra la fecha, los dos jugadores con su mazo, el marcador y los **puntos de la
serie**: círculos verdes y rojos que dicen cómo fue juego a juego. Un `2–1` con `verde-rojo-verde`
se lee de un vistazo.

**Ver** abre el detalle: el marcador grande, la tabla juego a juego con quién empezó, las notas,
las listas completas de los dos mazos (desplegables) y el formulario para editar o borrar.

---

## Calendario

Vista de mes con dos tipos de cosa:

- **Eventos** que añadís vosotros: jornadas (dorado), torneos, fechas límite.
- **Partidas ya jugadas** (gris), con su marcador.

Navega con `◀ ▶` y vuelve al mes actual con **Hoy**.

Debajo, el formulario para **añadir un evento** (título, fecha, tipo, competición y una nota
como "Casa de Javi, 18:00") y la **agenda** con todo lo que queda por delante.

---

## Estadísticas

La pantalla más densa. Todo se puede filtrar por competición.

**Las cuatro cifras de arriba**: partidas y juegos, arquetipos distintos vistos, con qué
frecuencia gana quien empieza, y el reparto entre Bo1/Bo3/Bo5.

**Uso del metagame** — cuántas veces se ha llevado cada mazo, y qué porcentaje del total supone.

**Rendimiento por arquetipo** — porcentaje de victorias de cada uno, en verde si va por encima
del 60% y en rojo por debajo del 40%. Solo salen los que se han jugado al menos dos veces.

**Matriz de emparejamientos** — la joya de la pantalla. Cada casilla dice qué porcentaje de
victorias tiene el mazo de la **fila** contra el de la **columna**. Verde favorable, rojo
desfavorable, azul equilibrado.

> **El color es más intenso cuantas más partidas hay detrás**, a propósito: un 100% de una sola
> partida se ve pálido y un 60% de doce partidas se ve sólido. Pasa el ratón por encima de
> cualquier casilla para ver cuántas partidas la respaldan. Solo entran partidas donde **los dos**
> jugadores tenían mazo asignado.

**Cómo terminan las series** — cuántos Bo3 acaban 2–0 y cuántos 2–1. Si casi todos son 2–1,
vuestro metagame está más equilibrado de lo que parece.

**Ventaja del primer turno** — sobre juegos individuales, no series, y solo los que llevan
anotado quién empezó.

**Actividad por mes** — cuántas partidas jugáis cada mes.

---

## Perfil

Tu ficha, o la de cualquiera (pulsa un nombre en cualquier tabla, o usa las pastillas de arriba).

- **Cuatro cifras**: partidas, % de victorias con el detalle de juegos, Elo con la diferencia
  desde el inicio, y racha actual con la mejor racha histórica.
- **Evolución del Elo** en grande.
- **Tus mazos**: qué has llevado, cuántas veces, con qué resultado.
- **Enfrentamientos directos**: tu récord contra cada rival, con una barra de balance.
- **Emparejamientos que te van**: cruces concretos de arquetipo (tu mazo contra el suyo) donde
  hayas jugado al menos dos veces, ordenados de mejor a peor. Debajo, un resumen de tu mejor y
  tu peor cruce.
- **Historial** completo.

---

## Ajustes

**Liga** — nombre, temporada, puntos por victoria/empate/derrota, Elo inicial y factor K, y el
código de invitación.

> El código de Ajustes **manda sobre** el del fichero `.env`. Si lo dejas vacío aquí, se usa el
> del `.env`; si los dos están vacíos, cualquiera con el enlace entra eligiendo jugador.

Cambiar la puntuación o el Elo **recalcula el ranking entero al momento**: no hay acumulados
guardados, todo se deriva del historial cada vez que se pinta la pantalla.

**Jugadores** — añadir, editar, desactivar. De cada uno: nombre, color, fecha de alta, PIN
opcional, si es organizador y si cuenta para el ranking.

> **Borrar un jugador con partidas no lo borra: lo desactiva.** Es a propósito. Borrarlo dejaría
> el historial huérfano y el ranking dejaría de cuadrar. Un jugador desactivado desaparece de
> los desplegables y del ranking, pero sus partidas siguen contando para las estadísticas
> generales.

**Cómo se calcula todo** — un resumen de las fórmulas, ahí mismo en la pantalla.

---

## Preguntas frecuentes

**¿Puedo registrar una partida de hace un mes?**
Sí. Pon la fecha real y todo se ordena y recalcula solo.

**¿Y si nos equivocamos en un resultado?**
Se edita desde el detalle de la partida. El Elo y el ranking se recalculan enteros desde el
historial, así que queda todo coherente.

**¿Qué pasa si no anotamos el mazo?**
La partida cuenta para el ranking, el Elo y los enfrentamientos directos. No cuenta para el uso
del metagame, el winrate por arquetipo ni la matriz de emparejamientos.

**¿Puedo cambiar el mazo de una partida ya guardada?**
Sí, editándola. Las estadísticas de metagame se recalculan.

**¿Y si dos jugadores usan el mismo arquetipo?**
Perfecto, es lo deseable. Cada uno tiene su mazo (con su nombre y su lista), pero los dos
apuntan al mismo arquetipo y suman a la misma casilla de la matriz.

**¿Se puede jugar un empate?**
Sí: en el resultado juego a juego, elige *Empate / tiempo*. Si la serie acaba igualada, cuenta
como empate y suma los puntos de empate configurados.

**¿Los sprites salen rotos?**
El identificador del Pokémon no coincide con el de Limitless. Corrígelo en el mazo. No afecta a
ninguna estadística.

**¿Cuántos jugadores aguanta?**
El diseño actual carga toda la liga de una vez porque con un grupo cerrado es lo más rápido.
Aguanta de sobra decenas de jugadores y miles de partidas. Ver
**[03 · Arquitectura](03-arquitectura.md#límites-y-cuándo-preocuparse)**.
