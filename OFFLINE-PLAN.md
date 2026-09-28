# Funcionar sin cobertura y sincronizar al volver

Preguntabas si se podría. **Sí, y además Arena está mejor colocada que la mayoría de apps para
hacerlo**, por una decisión que ya tomamos hace versiones y que no sabíamos que iba a servir
para esto. Aquí va el plan; no he escrito nada de código todavía.

## Por qué hoy no funciona

Arena es Next.js con App Router y Server Components: cada pantalla se pinta en el servidor y
llega ya montada. Sin red no hay pantalla. Y apuntar una ronda es una Server Action, que es una
petición HTTP: sin red, falla y se pierde lo tecleado.

En un pabellón con dos mil personas y un solo repetidor, eso pasa. Es el sitio donde la app
más falta hace y donde peor va.

## Las tres capas, de menos a más trabajo

Son independientes. Se pueden hacer en este orden y cada una ya sirve por sí sola.

### Capa 1 — Que la app abra sin red

Un *service worker* y un manifiesto. Con eso la app se instala en la pantalla de inicio del
móvil, abre sin cobertura y enseña la última versión de las pantallas que ya habías visitado en
vez de la pantalla de dinosaurio del navegador.

Es la capa más barata y la que más se nota. Un par de días.

El matiz: el layout de la app es `force-dynamic` porque hay sesión de por medio, así que hay
que cachear con cabeza —la carcasa sí, los datos de sesión no— para no enseñarle a alguien el
ranking cacheado de otra persona.

### Capa 2 — Que la pantalla del torneo tenga los datos

Al abrir un torneo con red, guardar en IndexedDB lo que esa pantalla necesita: las rondas
apuntadas, el catálogo de arquetipos, la estructura del evento y los umbrales. Sin red, la
pantalla se pinta de ahí, con un aviso arriba de «sin conexión · datos de hace 20 minutos».

Lo importante es que **no hace falta la base entera**: el torneo en curso son catorce rondas y
un puñado de mazos. Cabe de sobra.

Aquí hay que sacar el cálculo del camino al corte al cliente, que hoy vive en el servidor. No
es difícil: `cut.ts` y `estructura.ts` son puros a propósito y no importan nada, así que
funcionan igual en el navegador. Esa decisión, que tomamos para poder testearlos, es la que
hace esto barato.

### Capa 3 — Apuntar sin red y que suba solo

La de verdad. Al apuntar una ronda sin conexión:

1. Se escribe en IndexedDB y se pinta al momento, marcada como «pendiente».
2. Se mete en una cola de cambios.
3. Cuando vuelve la red —el navegador avisa, y en Android hay *Background Sync* que lo hace
   aunque la app esté cerrada— la cola se vacía contra el servidor, en orden.

**Y aquí está la parte que ya está resuelta sin querer.** El problema clásico de esto es qué
pasa si un cambio se envía dos veces: acabas con la ronda 9 duplicada. En Arena eso no puede
pasar, porque la tabla `matches` tiene desde la v0.4 un índice único parcial sobre
`(tournamentId, playerAId, round)`. Reenviar la ronda 9 no crea una segunda: choca con el
índice y no hace nada. La cola puede reintentar con toda tranquilidad.

Lo que sí hay que decidir es **quién gana si el mismo dato cambió en los dos sitios**: apuntaste
la ronda 9 en el móvil sin red y luego la corregiste desde el portátil. Mi propuesta es la
aburrida y la que no pierde datos: gana lo del servidor, y lo de la cola que choque se guarda
aparte y se te enseña —«esto no se pudo subir porque ya había otra cosa: ¿lo mando igual o lo
descarto?»—. Resolver conflictos solo, en silencio, es como se pierden las cosas.

## Lo que NO haría

**Sincronización bidireccional de toda la app.** Que el ranking, las estadísticas y el metagame
funcionen sin red y se reconcilien solos es un orden de magnitud más de trabajo, y para nada:
esas pantallas se miran en el sofá, con wifi. Lo que se usa de pie en un pabellón es apuntar la
ronda, y eso es lo que tiene que aguantar sin cobertura.

## Coste, por encima

| Capa | Qué te da | Esfuerzo |
| --- | --- | --- |
| 1 — PWA | Abre sin red, se instala en el móvil | Pequeño |
| 2 — Caché del torneo | La pantalla del torneo funciona sin red | Medio |
| 3 — Cola de cambios | Apuntar sin red y que suba solo | Medio-alto |

La 1 y la 2 juntas son una versión. La 3 es otra, y merece ir sola porque toca la forma en que
se escribe en la base y conviene probarla con calma.

## Lo que haría falta de ti

Una decisión y una prueba:

- **La decisión:** si te vale con que funcione el torneo en curso (mi recomendación) o quieres
  la app entera.
- **La prueba:** el día de un Regional, con el móvil en modo avión un rato. Esto no se valida
  en un escritorio con fibra; se valida en el sitio donde falla.
