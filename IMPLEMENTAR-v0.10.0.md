# Cómo meter la v0.10.0 en `develop`

Va sobre la v0.9.1. **Toca la base de datos**: una columna nueva y una tabla que se borra.

```bash
git checkout develop
git pull
unzip -o arena-v0.10.0-cambios.zip -d .

# los ficheros que desaparecen
git rm -r "src/app/(app)/live"
git rm src/components/LiveImport.tsx src/lib/ptcglive.ts tests/ptcglive.test.ts

npm run db:push        # ANTES de desplegar
npm test               # 113
npm run build
```

> **Antes del `db:push`:** si llegaste a importar algo en TCG Live y lo quieres conservar,
> sácalo primero, porque la tabla se borra y eso no se deshace:
> `SELECT * FROM ptcg_live_matches ORDER BY date;`

---

## 1. Lo que pediste, y dónde ha quedado

| Petición | Dónde |
|---|---|
| Orden V–D–E en todas partes | `Record` (`ui.tsx`) y la tabla del ranking. |
| El ranking no enseña el avatar | Arreglado: ahora sale el Pokémon o la foto. |
| Resetear el Elo | Ajustes → **Contar el Elo desde** + botón «empezar de cero hoy». |
| Quitar TCG Live | Fuera entero, tabla incluida. |
| Medallas de gimnasio | Vitrina en el perfil, con nueve medallas de tres escalones. |
| Qué necesitas para el top cut | **Ya existía desde la v0.8.0**: sale en la ficha de un torneo abierto, en cuanto tiene asistencia y rondas. Si no te aparece, es que falta uno de esos dos datos — el propio panel lo dice. |
| Mejores resultados en el perfil | Los cuatro mejores puestos, como en el stream. |
| Ranking de conversión en Inicio | %Cut, %T8, %T4, %Ganados, %V y victorias, con filtro por tipo de torneo. |
| Tabla y gráfica por mazo | En Estadísticas: «Qué mazos llegan al corte» y «Conversión mes a mes». |
| Zoom y responsive en móvil | Ver el punto 4. |

---

## 2. Dos cosas que conviene entender

### La conversión al corte no es un porcentaje cualquiera

El denominador **no** es «todos tus torneos»: es «tus torneos que tenían top cut». Un
Challenge de 12 personas sin corte no puede contar como un corte que se te escapó.

Por eso a veces verás un **guion** en vez de un 0%. No es un fallo: quiere decir que no hay
nada que medir todavía. Un cero ahí sería decir algo falso de alguien.

Las otras tres —top 8, top 4 y ganados— sí van sobre todos los resultados con puesto
apuntado.

### Reiniciar el Elo no borra nada

El Elo **no está guardado en la base de datos**. Se recalcula desde las partidas cada vez que
se pinta el ranking. Por eso no hay un número que poner a cero.

Lo que hace el botón es poner una **fecha de corte**: a partir de ahí, `eloTable` ignora lo
anterior y todos vuelven a 1000. Las partidas siguen exactamente donde estaban y se ven en el
resto de la app igual que antes. Quitas la fecha desde Ajustes y vuelve el Elo de siempre,
idéntico. Por eso el botón no pide confirmación: lo que la pide es lo que no se deshace.

---

## 3. Las medallas

Nueve, cada una con bronce, plata y oro:

| Medalla | Mide | Escalones |
|---|---|---|
| Constancia | Partidas registradas | 10 · 50 · 150 |
| Victoria | Partidas ganadas | 5 · 25 · 75 |
| Racha | Victorias seguidas | 3 · 5 · 8 |
| Versatilidad | Arquetipos distintos | 3 · 6 · 10 |
| Archivo | Mazos con las 60 cartas | 1 · 3 · 8 |
| Viajera | Torneos disputados | 1 · 5 · 15 |
| Top Cut | Veces en el corte | 1 · 3 · 8 |
| Championship | CP de la temporada | 50 · 200 · 500 |
| Cronista | Rondas con el turno anotado | 5 · 20 · 50 |

Tres reglas que están detrás de esa lista, por si quieres tocarla (`src/lib/badges.ts`):

1. **Cada medalla mide algo distinto.** «10 partidas», «20 partidas» y «30 partidas» son tres
   veces la misma medalla; por eso los escalones son de la misma, no medallas separadas.
2. **Se ven todas, ganadas o no**, con lo que falta debajo. El hueco con «te faltan 2
   victorias» es lo que hace que alguien registre la partida.
3. **Ninguna depende de los demás.** No hay medalla por ser el primero del ranking: en un
   grupo de cinco eso es una alegría y cuatro frustraciones.

---

## 4. El móvil

Dos problemas distintos, con dos causas distintas.

**El zoom al tocar un campo.** Safari en iPhone amplía **solo** en cuanto enfocas un `input`,
`select` o `textarea` con letra menor de 16px, y después no vuelve: te deja la página
ampliada con la cabecera medio fuera. El cuadro de pegar la lista y el buscador de mazos iban
a 14px. Ahora todos los campos van a 16px en pantallas táctiles — y el gesto de ampliar a mano
**sigue funcionando**, que capar el zoom rompe la accesibilidad.

**La barra de arriba cortada al alejar el zoom.** La causa no era la barra: era el
desbordamiento horizontal. Basta con que un elemento se salga un píxel por la derecha para
que el documento sea más ancho que la ventana, y entonces la cabecera `sticky` —que solo mide
el ancho de la ventana— deja de cubrir la parte derecha. Se ve exactamente como una barra
cortada.

Ahora `html` y `body` recortan con `overflow-x: clip`. **`clip` y no `hidden`**: `hidden`
crearía un contexto de desplazamiento y rompería el `sticky` de los hijos, que es justo lo que
hay que conservar. Lo que es ancho a propósito —la matriz, las tablas— sigue teniendo su
propio desplazamiento lateral con el dedo.

Y tres arreglos menores: el teclado ya no empuja la cabecera fuera (`interactiveWidget`), la
franja reservada para la barra de desplazamiento solo se aplica donde hay ratón, y los
títulos largos de las tarjetas ya no ensanchan la página.

**Lo que no puedo hacer desde aquí es probarlo en un iPhone de verdad.** Si después de esto
sigue habiendo algún sitio que se corte, dime en qué pantalla y con qué gesto y lo miro.

---

## 5. Qué probar

1. **Ranking.** Sale el avatar de cada uno (el Pokémon o la foto), no la inicial. Y el récord
   dice V–D–E: un «3–1» son tres victorias y una derrota.
2. **Perfil.** Abajo del todo, la vitrina de medallas: unas encendidas y otras apagadas con
   lo que falta. Y encima, «Mejores resultados» con tus cuatro mejores puestos.
3. **Inicio.** «Conversión en torneos». Toca el filtro de tipo y mira que la URL cambia.
   Fíjate en si alguna fila tiene un guion en %Cut: eso es que sus torneos no tenían corte.
4. **Estadísticas.** Abajo, «Qué mazos llegan al corte» y, si tenéis torneos en dos meses
   distintos, la gráfica de «Conversión mes a mes».
5. **Ajustes → Contar el Elo desde.** Pulsa «empezar de cero hoy» y mira el ranking: todos a
   1000. Vuelve a Ajustes, «volver a contar desde el principio», y el ranking tiene que quedar
   **exactamente** como estaba. Eso confirma que no se ha perdido nada.
6. **El móvil.** Toca el cuadro de pegar una lista al crear un mazo: no debe ampliarse solo.
   Aleja el zoom con dos dedos: la barra de arriba tiene que seguir llegando de lado a lado.
7. **Que TCG Live ya no está** ni en el menú lateral ni en «Más».

---

## 6. Lo que sigue pendiente

- City Leagues de Japón en Top Decks.
- Heat map como rejilla de colores.
- Filtro por región del meta mundial: no existe en la API de Limitless.
- `loadSnapshot()` sigue cargando la base entera en cada petición. Con dos temporadas encima
  habrá que paginar Resultados y cachear el snapshot.
- **Aquí no puedo ejecutar `npm run build`**: el registro de npm está capado y no hay forma de
  instalar `next`, `drizzle-orm` ni `@types/react`. Corren las 113 pruebas, el comprobador de
  imports y un `tsc` estricto, pero sin esos tipos se me puede escapar un error de
  asignación como el de la v0.9.0. Si el build saca algo, pégamelo tal cual.
