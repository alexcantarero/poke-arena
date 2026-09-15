# Apéndice al manual de usuario — v0.5.0

Igual que con el README: **no tengo `docs/02-manual-usuario.md` en este paquete de cambios**
(solo viajan los ficheros que se tocaron, y ese no es uno de ellos), así que esto son
secciones para insertar a mano en el sitio que les corresponda, no el manual entero.

## Al crear o editar un torneo

Donde el manual explique la pantalla de "Crear torneo" (fecha, asistencia, rondas…), añade:

> Junto a la fecha se puede poner la **hora de inicio** y, junto a la asistencia, el
> **precio de entrada** (en euros; se guarda redondeado al céntimo). Los dos son opcionales:
> si no se saben, se dejan en blanco y no pasa nada.

Y donde se explique el desplegable de "Tipo" del torneo:

> **Pokémon Cup** y **Pokémon Challenge** ya no aparecen en la lista: son el mismo evento
> que **League Cup** y **League Challenge** y puntúan exactamente igual, así que ahora solo
> hace falta elegir uno de los dos. Si tenías un torneo viejo marcado como "Pokémon algo",
> al actualizar la web se convierte solo en su equivalente.

## Al apuntar una ronda

Donde se explique "Apuntar la ronda N" y el selector "Con qué mazo juegas el torneo",
añade un párrafo:

> Si todavía no tienes la lista de 60 cartas de tu mazo apuntada en Mazos, puedes elegir
> solo el **arquetipo** (el Pokémon principal) en ese mismo selector, en vez de un mazo
> concreto. Se bloquea para todo el torneo igual que un mazo con lista: no hace falta volver
> a elegirlo en cada ronda.

Y en la sección de "juego a juego" (donde se explica marcar Gané/Empate/Perdí juego por
juego), añade:

> Si uno de los juegos se marca como **Empate**, ahí se acaba la ronda: los juegos
> siguientes ni se enseñan. Gana la ronda quien tenga más juegos ganados hasta ese punto; si
> van iguales, la ronda queda en empate. Es lo que pasa de verdad en mesa cuando el juez
> corta el tiempo a mitad de un juego.

Junto al número de cada ronda (`R1`, `R2`…), si el torneo tiene declarado el número de
rondas de suizo y un top cut, las rondas de después del suizo llevan una etiqueta con la
fase: **Cuartos**, **Semifinal**, **Final**… No hace falta marcar nada a mano, sale sola de
cuántas rondas se anunciaron y de qué tamaño es el corte.

> Esto todavía no separa *day 1* de *day 2* en un torneo con corte de asistencia a mitad
> (un Regional grande, por ejemplo): de momento todo lo que no es top cut se etiqueta igual,
> como "Suizo". Se puede seguir apuntando esas rondas sin ningún problema, solo que la
> etiqueta no distingue el día.

## Avisos al guardar (snackbar)

Nuevo en esta versión: al crear, guardar, cerrar o borrar un torneo, y al guardar o borrar
una ronda, aparece un aviso pequeño abajo confirmando lo que ha pasado ("Torneo creado.",
"Ronda 3 guardada."…). Se cierra solo a los pocos segundos, o con la ×.

## En el perfil

El orden de las secciones cambia un poco: la evolución del Elo, tus mazos, los
enfrentamientos directos y los emparejamientos salen ahora **antes** que el desglose de
Championship Points. El contenido es el mismo; solo el orden en que se lee de arriba abajo.

---

Si me subes `docs/02-manual-usuario.md` la próxima vez, inserto esto directamente en el
sitio exacto en vez de dejarte los fragmentos sueltos.
