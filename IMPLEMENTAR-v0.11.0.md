# Cómo meter la v0.11.0 en `develop`

Va sobre la v0.10.0. **No toca la base de datos** y no añade dependencias.

```bash
git checkout develop
git pull
unzip -o arena-v0.11.0-cambios.zip -d .
npm test        # 122
npm run build
```

---

## 1. Lo que no se puede hacer, y por qué

Dos puntos del prompt chocan con la realidad. Los cuento primero porque cambian lo que hay
en el zip.

### «Último Regional: Frankfurt» con datos de Limitless

**No se puede.** Lo comprobé pidiéndole a su API los veinte torneos más recientes, y son
estos: «Pudding Weekly #14», «CrownOfSpain #8», «Torneo Relámpago ⚡ #82», «SEASAC League
Challenge #14»… `play.limitlesstcg.com` es **su plataforma de torneos por internet**, y su API
sirve eso y solo eso.

Los Regionales presenciales se publican en `limitlesstcg.com`, que es otra web y no tiene API.
La única forma de sacarlos sería raspar el HTML — que es exactamente lo que llevamos toda la
aplicación evitando con RK9, y además se rompe el día que cambien una clase de CSS.

Elegiste la alternativa: la pestaña existe, se llama **«Último torneo»** y trae el torneo
online más grande de los últimos catorce días con todo el detalle que pedías. Como foto del
metagame vale —son torneos de cien o doscientas personas, salen varios por semana, y el
metagame online se mueve antes que el presencial—. Lo que no hace es llamarse Regional.

**Y de paso, una corrección que venía de antes:** lo que la app llamaba «Meta mundial» son
esos mismos torneos online. Estaba mal etiquetado desde la v0.6.0. Ahora pone **«Meta
online»** en todas partes, con una nota que lo explica.

### La imagen de Substitute para «Other»

Tampoco. Su CDN no la sirve: `…/pokemon/gen9/substitute.png` devuelve 404, y las variantes que
probé también. Los sprites que sí usamos son los de Pokémon con número de Pokédex.

Y dibujarlo yo sería copiar un diseño de Pokémon. Así que «Other» lleva ahora un marcador
**nuestro**: tres cartas apiladas dentro de un círculo de trazo discontinuo. Se lee como
«varios mazos» y no como un sprite roto, que era el problema real.

---

## 2. Los filtros que se suman

Ya se pueden marcar varios tipos de torneo a la vez en la conversión de Inicio, y cada chip
encendido lleva una × para quitarlo.

Un matiz sobre el «AND lógico» que pedías: **dentro de la misma dimensión los valores se
suman**, no se multiplican. Pedir «regional Y league cup» a la vez no devolvería nunca nada,
porque un torneo tiene un solo tipo. Lo que sí es «y» es la combinación entre dimensiones
distintas —tipo y fecha, por ejemplo—, y eso ya funcionaba así en Resultados y Estadísticas.

---

## 3. El camino al corte

Dos cambios:

**Las dos cifras, separadas y en grande.** Antes iban en un párrafo:

```
✅ Entrada segura     4-1 o mejor
   Se esperan 6 personas con 4 victorias o más, y en el top 8 caben 8.

🔄 Depende del desempate     3-2
   Ahí se esperan unas 16 para 8 plazas: entra quien tenga mejor resistencia.
```

El «depende» no es un fallo de la estimación. En un suizo, con el récord justo de la línea
siempre hay más gente que huecos, y quién pasa lo decide la resistencia — contra quién te
tocó jugar. Eso no se puede saber de antemano, y decirlo es más útil que fingir un sí o un no.

**Un solo «fuera».** De todos los finales que no entran se enseña el mejor, y debajo dice
cuántos peores había. Diez filas repitiendo «así no entras» enterraban las dos que importan.

---

## 4. Estadísticas: la fuente ahora manda en toda la página

Con **«Meta online»** ya no se quedan debajo la matriz de emparejamientos, el primer turno,
la actividad por mes y el rendimiento por mazo. Esas salen de **vuestras** partidas y no
existen fuera de la liga; dejarlas puestas era lo que hacía pensar que el filtro no
funcionaba. Ahora se ocultan y una línea explica por qué, con un enlace mental a **Comparar**,
que es donde se ven las dos cosas juntas.

**Orden ascendente/descendente** en «Uso del metagame», «Rendimiento», «Victorias por
arquetipo», «Qué mazos llegan al corte» y la conversión de Inicio. Descendente por defecto.
Detalle: los arquetipos **sin dato** se quedan al final en los dos sentidos — un mazo sin
conversión calculable no es «el peor», es que no hay nada que ordenar.

---

## 5. La pestaña «Último torneo»

Cuarta pestaña en Estadísticas. Trae:

- Cabecera del torneo: nombre, organizador, jugadores, rondas y tamaño del corte.
- **El top 8** con el mazo de cada uno y su récord.
- Por arquetipo: **Play** (qué parte del torneo llevaba ese mazo), **%V** (qué parte de sus
  rondas ganó) y **Cut** (qué parte de sus listas entró en el corte). Tres preguntas
  distintas: cuánto te lo cruzas, si aguanta, si cierra.

El tamaño del top cut sale de las `phases` que devuelve la API: si hay una fase que no es
suizo, sus rondas son el logaritmo del corte — tres rondas son cuartos, semifinal y final, o
sea un top 8. Está escrito para tolerar nombres nuevos: lo que se mira es que **no** sea
suizo, no que se llame de una forma concreta.

Sobre la automatización que pedías: **no hace falta cron**. Las llamadas van cacheadas seis
horas en el propio `fetch`, así que la pantalla se actualiza sola sin ninguna tarea
programada. En Vercel gratis un cron es una vez al día, o sea peor.

---

## 6. Los cortes en móvil

**Las pestañas de la portada.** «Clasificación», «Metajuego» y «Tus CP» usaban la clase
`.scroll-x`, que lleva un margen negativo de 16px para que el contenido ancho llegue de borde
a borde de la *página*. Pero viven dentro de una tarjeta con `overflow-hidden` —la que redondea
las esquinas—, así que ese margen las sacaba fuera y el recorte se comía la primera y la
última. Era eso, y solo eso.

**La tabla de conversión** ya no dispara el «atrás» del navegador al deslizarla hasta el final.

**Punto de corte nuevo `xs` (400px).** El salto de «móvil» a los 640px de Tailwind es
demasiado grande para las filas densas: un iPhone SE mide 375 y un Pro Max 430. En la
clasificación de la portada, el récord se esconde por debajo de 400px — está entero en Ranking.

---

## 7. Qué probar

1. **Inicio → Conversión en torneos.** Marca dos tipos: los dos chips quedan encendidos con
   su ×, y abajo dice que se suman. Toca las flechas de orden y mira que la URL cambia.
2. **Estadísticas → Meta online.** La página de abajo desaparece y sale la explicación. Vuelve
   a **Comparar** y reaparece todo.
3. **Estadísticas → Último torneo.** Tarda unos segundos la primera vez. Comprueba que el
   nombre del torneo es real y que el top 8 tiene sentido.
4. **Un torneo abierto → Camino al corte.** Las dos tarjetas, verde y azul, con el récord en
   grande. Y un solo escenario «fuera».
5. **Portada en el móvil.** Las pestañas de «Cómo va la cosa» ya no se cortan por los lados.
6. **Cualquier gráfico con «Other».** Ya no hay sprite roto: sale el marcador de tres cartas.

---

## 8. Lo que sigue pendiente

- City Leagues de Japón en Top Decks.
- Heat map como rejilla de colores.
- `loadSnapshot()` sigue cargando la base entera en cada petición.
- **Aquí no puedo ejecutar `npm run build`**: el registro de npm está capado. Corren las 122
  pruebas, el comprobador de imports y un `tsc` estricto. Si el build saca algo, pégamelo.
