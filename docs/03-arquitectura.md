# 03 · Arquitectura

Por qué está montado así, cómo viaja un dato desde el formulario hasta la pantalla, y qué hace
cada carpeta.

---

## El stack, y por qué

| Decisión | Motivo |
|---|---|
| **Next.js 15 + TypeScript** | Un solo lenguaje y un solo proyecto para el front y el back. Es lo que más documentación tiene y lo que mejor entiende cualquier asistente de código, así que pedir cambios es fácil. |
| **Neon** en vez de Supabase | El plan gratuito de Supabase **pausa** los proyectos tras unos días sin actividad, y una liga que juega los martes se pausa sola. Neon solo apaga el cómputo (arranca en menos de un segundo) y nunca borra los datos. |
| **Drizzle** en vez de Prisma | El esquema es un fichero TypeScript legible (`src/db/schema.ts`), las consultas se parecen a SQL y no hay un motor extra que instalar ni un `generate` que recordar. |
| **Cookie firmada** en vez de Auth0 / Clerk / Supabase Auth | El requisito era código de invitación: sobra un proveedor externo, su cuota gratuita y su configuración. Todo cabe en 80 líneas de `src/lib/auth.ts`. |
| **CSS plano** en vez de Tailwind | Menos piezas que puedan romperse al actualizar, y cualquiera cambia un color abriendo un fichero y buscando el nombre de la variable. |
| **Server Components + Server Actions** | Las páginas leen la base de datos directamente, sin una capa de API intermedia que escribir y mantener. Los formularios llaman a funciones de servidor sin `fetch` ni endpoints. |

---

## Cómo viaja un dato

Un ejemplo completo: registrar una partida.

```
1. El navegador abre /partidas/nueva
       │
2. page.tsx (Server Component) llama a loadSnapshot()
       │      lee jugadores, mazos, arquetipos y competiciones de Neon
       ↓
3. Pinta <MatchForm> (Client Component) con esos datos ya dentro
       │      el usuario rellena; toda la lógica de "¿está decidida la serie?"
       │      ocurre en el navegador, sin ida y vuelta al servidor
       ↓
4. Al enviar, el <form action={saveMatch}> llama a la Server Action
       │      React serializa el FormData y lo manda al servidor
       ↓
5. saveMatch() (src/actions/index.ts) valida, escribe en `matches` y `games`
       │
6. revalidatePath("/", "layout") invalida la caché de todas las páginas
       │
7. redirect("/resultados") y la página se vuelve a pintar con el dato nuevo
```

No hay endpoints REST, ni estado global en el cliente, ni sincronización que mantener. La base
de datos es la única fuente de verdad y cada carga de página la vuelve a leer.

---

## Las tres capas

### 1. Lógica pura — `src/lib/stats.ts`, `decklist.ts`, `format.ts`, `pokemon.ts`

Funciones sin efectos secundarios: entran datos, salen datos. No conocen la base de datos, ni
React, ni el navegador. Se pueden ejecutar en el servidor, en el cliente o desde un script de
prueba.

Aquí vive todo lo que de verdad hace la aplicación: el cálculo de la clasificación, el Elo, la
resistencia, la matriz de emparejamientos, el emparejamiento de rondas y el importador de
listas de mazo.

> **Si quieres cambiar cómo funciona la liga, este es el sitio.** Y como son funciones puras,
> se pueden probar sin levantar nada:
> ```bash
> node --experimental-strip-types -e '
>   import("./src/lib/stats.ts").then(s => console.log(s.suggestedRounds(8)))
> '
> ```

### 2. Acceso a datos — `src/lib/data.ts` y `src/db/`

`loadSnapshot()` carga **toda la liga de una vez** en ocho consultas paralelas, más una para
los juegos, y devuelve además los índices que las páginas necesitan (`playersById`,
`archIndex`, …) y el Elo ya calculado.

Puede parecer bruto, pero con un grupo cerrado son unos pocos kilobytes: una consulta por
pantalla sería más código y más lento (más viajes de ida y vuelta a la base de datos). Está
todo en un solo fichero justamente para que sea fácil de cambiar el día que haga falta paginar.

`src/db/index.ts` abre la conexión **de forma perezosa**: el cliente no se crea hasta la primera
consulta. Es importante, porque `next build` carga todos los módulos de página y si la conexión
se abriera al importar, no se podría compilar sin tener la base de datos delante.

### 3. Interfaz — `src/app/` y `src/components/`

Casi todo son **Server Components**: se ejecutan en el servidor, leen datos y devuelven HTML.
No mandan JavaScript al navegador.

Solo ocho componentes son de cliente (`"use client"`), y siempre por el mismo motivo: necesitan
estado o eventos.

| Componente | Por qué es de cliente |
|---|---|
| `MatchForm` | El marcador y las filas de juego cambian mientras rellenas |
| `DeckForm` | Interpreta la lista pegada en vivo, sin recargar |
| `CompetitionForm` | Selección de participantes y campos que aparecen según el formato |
| `PlayerEditor` | Abre y cierra el formulario de edición |
| `RankingTable` | Ordena por cualquier columna al pulsar la cabecera |
| `Filters` | Escribe en la query string y navega |
| `EnterForm` | Muestra el campo de PIN según el jugador elegido |
| `Nav` | Marca la sección activa según la ruta |

---

## Acceso y sesión

Todo está en **`src/lib/auth.ts`**, y es deliberadamente pequeño:

- La cookie `arena_session` guarda `{ playerId, issuedAt }` en base64url, con una firma HMAC-SHA256
  calculada con `SESSION_SECRET`.
- Al leerla se recalcula la firma y se compara con `timingSafeEqual`. Si no cuadra, no hay sesión.
- La cookie es `httpOnly`, `sameSite: lax` y `secure` en producción. Dura 180 días.
- `src/app/(app)/layout.tsx` comprueba la sesión y redirige a `/entrar` si no la hay. Como es el
  layout del grupo de rutas `(app)`, **protege todas las páginas de dentro a la vez**: no hay
  que acordarse de comprobarlo en cada una.

Esto no es autenticación fuerte y no pretende serlo: quien tiene el código puede elegir ser
quien quiera. El PIN por jugador sube un peldaño. El día que os quedéis cortos, **este es el
único fichero que hay que cambiar** — sustituye `readSession` y `writeSession` por Auth.js,
Clerk o lo que prefieras, y el resto de la aplicación no se entera.

---

## Grupos de rutas

```
src/app/
  layout.tsx        ← HTML, tipografías. Envuelve todo.
  entrar/           ← pública
  (app)/
    layout.tsx      ← comprueba sesión + barra lateral
    …               ← todo lo demás, protegido
```

Los paréntesis de `(app)` significan que **no aparece en la URL**: `/ranking`, no `/app/ranking`.
Sirve solo para agrupar las páginas que comparten layout y protección.

---

## Renderizado y caché

`src/app/(app)/layout.tsx` declara `export const dynamic = "force-dynamic"`, así que **todas las
páginas se pintan en cada petición**. Es lo correcto aquí: son datos que cambian y que solo ve un
grupo pequeño, y evita cualquier problema de "he guardado y no se ve".

Cada Server Action termina llamando a `revalidatePath("/", "layout")` —que invalida la caché de
la aplicación entera— o a `redirect()`, que además lleva a otra pantalla. Con este volumen es lo
más simple y no se nota.

Si algún día hay muchas visitas, el cambio sería revalidar solo las rutas afectadas y cachear
las pantallas de solo lectura.

---

## Límites y cuándo preocuparse

| Dimensión | Situación actual | Cuándo cambiar algo |
|---|---|---|
| Jugadores | Cargados todos en memoria | Cientos: da igual |
| Partidas | Todas cargadas en cada página | A partir de unos miles, empezar a paginar en `loadSnapshot()` |
| Almacenamiento | Unos KB por temporada | 0,5 GB del plan gratuito de Neon: inalcanzable |
| Cómputo Neon | Se despierta bajo demanda | 100 h/mes gratis; una liga privada usa una fracción mínima |
| Elo | Se recalcula entero en cada carga | Miles de partidas siguen siendo milisegundos |
| Concurrencia | Última escritura gana | Solo importaría si dos personas editan la misma partida a la vez |

La primera cosa que se quedaría corta es `loadSnapshot()`, y está aislada precisamente por eso.

---

## Escalar más adelante

El esquema ya está preparado para crecer sin rehacer nada:

- **Varias ligas independientes.** Añade una tabla `leagues` y una columna `leagueId` a
  `players`, `competitions`, `matches` y `events`. El resto del código filtra por ella.
- **Login de verdad.** `src/lib/auth.ts` es el único fichero que conoce la sesión.
- **Listas con imágenes de carta.** Ya se guardan interpretadas en `decks.list_json`; solo falta
  cruzarlas con una API de cartas. Ver **[08 · Datos externos](08-datos-externos.md)**.
- **Top cut real del suizo.** `pairRound()` ya devuelve emparejamientos por clasificación y el
  tamaño del cut está guardado en la competición; queda dibujar el cuadro.
- **Notificaciones.** Al crear los emparejamientos de una jornada, mandar un aviso. El punto de
  enganche es `createPairings()` en `src/actions/index.ts`.
