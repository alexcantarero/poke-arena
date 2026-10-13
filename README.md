# Arena — liga privada de Pokémon TCG

**v0.27.0**

Web para llevar vuestra liga entre amigos: ranking con Elo y resistencia, resultados juego a
juego, calendario, estadísticas de metagame —las vuestras y las del mundo— con matriz de
emparejamientos, torneos de fuera con recuento de Championship Points, simulador de manos y un
perfil por jugador. Pensada para el móvil y para un grupo cerrado, pero sin nada que impida
crecer.

```
Inicio · Ranking · Resultados · Calendario · Estadísticas · Torneos
Mazos · Competiciones · Top Decks · Perfil · Ajustes
```

| | |
|---|---|
| **Lenguaje** | TypeScript de punta a punta |
| **Framework** | Next.js 15 — App Router, Server Components, Server Actions |
| **Base de datos** | PostgreSQL en Neon, con Drizzle ORM |
| **Estilos** | Tailwind CSS v4, configurado desde CSS — sin `tailwind.config.js` |
| **Gráficas** | Recharts 3 (las de estadísticas) y SVG a mano (las pequeñas) |
| **Diseño** | mobile-first: barra inferior en el móvil, barra lateral en escritorio, PWA instalable |
| **Acceso** | cuenta por jugador (correo + contraseña con scrypt), alta por enlace de invitación, sesión en cookie firmada |
| **Datos de fuera** | Limitless TCG (sin clave) y pokemontcg.io (opcional) — los dos, prescindibles |
| **Hosting** | GitHub + Vercel + Neon, todo en plan gratuito |
| **Coste** | 0 € |

---

## Qué hay de nuevo

- **v0.11.0** — filtros que se **suman**, orden asc/desc en los gráficos, el camino al corte
  en dos cifras (entrada segura / depende), pestaña **«Último torneo»** con play rate y
  conversión, marcador propio para «Other», y el metagame de Limitless pasa a llamarse
  **online**, que es lo que es. Sin migración.
- **v0.10.0** — **medallas de gimnasio** en el perfil, **conversión a top cut** por jugador
  (Inicio) y por mazo (Estadísticas) con gráfica mes a mes, **mejores resultados** al estilo
  del stream, reinicio del Elo por fecha de corte, el récord en V–D–E, el avatar en el
  ranking, y el zoom del móvil arreglado. Fuera TCG Live. **Toca la base de datos.**
- **v0.9.0** — arreglados los **CP que no aparecían** al poner la asistencia tarde (ninguna
  pantalla lee ya la columna en crudo), campo de asistencia en la propia ficha del torneo que
  dice cuántos CP se está dejando cada uno, **calendario en color** y filtrable por tipo con
  los eventos oficiales de Europa, y la lista de torneos en orden de agenda. **Toca la base
  de datos.**
- **v0.8.0** — **camino al corte** (qué te hace falta para entrar en el top cut, con los CP de
  cada puesto), **importación de Pokémon TCG Live**, sección **Top Decks** con el metagame
  mundial, el Elo deja de contar los amistosos, sprites en las gráficas y filtro de ámbito en
  el Ranking. **Toca la base de datos**: hay migración.
- **v0.7.0** — capa visual: esqueletos de carga en vez de pantallas en blanco, pantallas de
  error y 404 propias, pastilla en la pestaña activa del móvil, respeto por la muesca y la
  barra de gestos del iPhone, matriz de emparejamientos que se desliza sin disparar el
  «atrás» del navegador. Y dos cosas de fondo: **buscador de cartas** en el editor de mazos
  (pokemontcg.io) y **cifras del metagame mundial** en Estadísticas.
- **v0.6.0** — el snackbar por fin aparece, filtros de verdad compartidos por Resultados y
  Estadísticas, metagame mundial desde Limitless con modo comparación, y simulador de manos
  (mulligan y probabilidad de apertura).
- **v0.5.0** — hora y precio del torneo, mazo fijable solo por arquetipo, rondas que saben si
  son suizo o top cut, y dos estadísticas nuevas: cuota de metagame y rendimiento por ronda.

Detalle completo en **[CHANGELOG.md](CHANGELOG.md)**.

---

## Arranque rápido

Si ya tienes Node.js 20+ y una rama de desarrollo en Neon:

```bash
npm install
cp .env.example .env.local     # y rellena DATABASE_URL y SESSION_SECRET
npm run db:push                # crea las tablas en la rama dev configurada localmente
npm run db:seed                # datos de ejemplo (opcional)
npm run invite                 # imprime el enlace para crear la primera cuenta
npm run dev                    # http://localhost:3000
```

¿Empiezas de cero en un ordenador nuevo? Ve al **[manual de instalación](docs/01-instalacion.md)**:
está escrito paso a paso, sin dar nada por sabido.

### Variables de entorno

| Variable | ¿Obligatoria? | Para qué |
|---|---|---|
| `DATABASE_URL` | **sí** | Cadena de conexión *pooled* de la rama **dev** de Neon para el entorno local. No pegues credenciales en el chat ni las subas al repo. |
| `SESSION_SECRET` | **sí** | Firma la cookie de sesión. Genérala con `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. |
| `LEAGUE_INVITE_CODE` | no | Código de alta. También se cambia desde Ajustes. |
| `LIMITLESS_API_KEY` | no | Los endpoints que usa Arena responden sin clave. Con clave se usa además el catálogo oficial de arquetipos. |
| `POKEMONTCG_API_KEY` | no | Sube el límite del buscador de cartas. Sin clave son 1.000 peticiones al día, de sobra. |

Las dos últimas son **fuentes externas y la app funciona entera sin ellas**: se queda sin el
metagame mundial y sin el buscador de cartas, y nada más. Se ve su estado en
**Ajustes → Datos del metagame → Fuentes externas**.

---

## Documentación

### Para ponerlo en marcha

| Documento | De qué trata |
|---|---|
| **[01 · Instalación en otro PC](docs/01-instalacion.md)** | Desde cero en Windows, macOS o Linux: Node, Git, Neon, variables de entorno y primer arranque, con una comprobación después de cada paso. |
| **[06 · Despliegue](docs/06-despliegue.md)** | Subirlo a internet gratis con GitHub + Vercel + Neon, y cómo lo lleváis dos personas. |
| **[12 · Antigravity y dev/prod](docs/12-antigravity.md)** | Abrir el proyecto en Antigravity, separar las ramas de Neon y trabajar con previews seguras. |

### Para usarlo

| Documento | De qué trata |
|---|---|
| **[02 · Manual de usuario](docs/02-manual-de-usuario.md)** | Pantalla por pantalla: entrar, registrar mazos y partidas, montar competiciones, leer el ranking y las estadísticas. |
| **[02b · Apéndice v0.5.0](docs/02-manual-usuario-apendice-v0.5.0.md)** | Lo que cambió en el flujo de torneos. |
| **[05 · Cómo se calcula todo](docs/05-estadisticas.md)** | Puntos, %V, resistencia, Elo, matriz de emparejamientos y ventaja del primer turno, con ejemplos numéricos. |

### Para mantenerlo y modificarlo

| Documento | De qué trata |
|---|---|
| **[03 · Arquitectura](docs/03-arquitectura.md)** | Por qué este stack, cómo viaja un dato desde el formulario hasta la pantalla, y qué hace cada carpeta. |
| **[04 · Modelo de datos](docs/04-modelo-de-datos.md)** | Las tablas, columna a columna, con sus relaciones y las decisiones detrás. |
| **[07 · Guía de desarrollo](docs/07-guia-de-desarrollo.md)** | Recetas concretas: añadir un campo, una pantalla, cambiar una fórmula, cambiar los colores. |
| **[08 · Datos externos y APIs](docs/08-datos-externos.md)** | Sprites y catálogo de Limitless, formatos de decklist que se importan, y qué APIs de cartas hay. |
| **[09 · Mantenimiento](docs/09-mantenimiento.md)** | Copias de seguridad, empezar una temporada nueva, migraciones y tareas periódicas. |
| **[10 · Solución de problemas](docs/10-solucion-de-problemas.md)** | Los errores concretos que puedes encontrarte y qué hacer con cada uno. |

---

## Estructura del proyecto

```
src/
  app/
    layout.tsx              envoltorio HTML, tipografías y elección de tema sin parpadeo
    globals.css             el diseño entero: paleta, tema claro/oscuro, clases compuestas
    global-error.tsx        el error que se lleva por delante el layout raíz
    not-found.tsx           404 de una URL que no existe
    entrar/                 pantalla de acceso (correo y contraseña)
    registro/[token]/       alta desde un enlace de invitación
    api/
      stats/route.ts        estadísticas locales y mundiales, en JSON
      cards/route.ts        búsqueda de cartas (pokemontcg.io)
    (app)/                  todo lo que va detrás del acceso
      layout.tsx            navegación, sesión y el aviso de abajo (snackbar)
      loading.tsx           esqueleto por defecto de todas las pantallas del grupo
      error.tsx             pantalla de error con botón de reintentar
      not-found.tsx         404 de algo que ya no está (una partida borrada)
      page.tsx              Inicio
      ranking/ resultados/ calendario/ estadisticas/ torneos/
      perfil/[id]/ mazos/ competiciones/ partidas/ mas/ ajustes/
      topdecks/             el metagame mundial, para elegir mazo
  components/
    ui.tsx                  piezas con datos: jugador, arquetipo, partida, barras
    primitives.tsx          piezas sin dependencias: Kpi y esqueletos (las usa el cliente)
    icons.tsx               iconos de línea, 24×24
    FilterPanel.tsx         el panel de filtros, un <form method="get"> — funciona sin JS
    MulliganSim.tsx         simulador de manos
    CardSearch.tsx          buscador de cartas
    AttendanceForm.tsx      la asistencia del torneo, y qué CP desbloquea
    BadgeCase.tsx           la vitrina de medallas del perfil
    BestFinishes.tsx        los cuatro mejores puestos, como en el stream
    ConversionTable.tsx     la tabla de conversión, para gente y para mazos
    CutOutlook.tsx          qué te hace falta para entrar en el top cut
    LiveImport.tsx          pegar el historial de TCG Live
    Matrix.tsx              matriz de emparejamientos
    statistics/             SourceTabs, KPICards, GlobalMeta, LastEvent, SortToggle
                            y las gráficas de Recharts
  actions/index.ts          Server Actions: todo lo que escribe en la base de datos
  db/
    schema.ts               las tablas
    index.ts                conexión (perezosa)
    seed.ts                 datos de ejemplo
  lib/
    stats.ts                motor de estadísticas (funciones puras)
    filters.ts              el motor de filtros, compartido por pantallas y API
    badges.ts               las medallas y sus escalones
    calendar.ts             los colores del calendario, uno por tipo de torneo
    tournamentStats.ts      conversión a top cut, top 8, top 4 y torneos ganados
    cut.ts                  la línea de corte de un suizo, estimada con la binomial
    mulligan.ts             probabilidad hipergeométrica y barajado Fisher-Yates
    cp.ts                   Championship Points: tablas por temporada y Best Finish Limit
    decklist.ts             importador de listas PTCG Live / PTCGO / Limitless
    cards.ts                URL de la imagen de una carta, sin llamar a nadie
    auth.ts                 contraseñas, sesión por cookie firmada e invitaciones
    pokemon.ts              tipos de energía, sprites y catálogo de arquetipos
    data.ts                 carga de datos para las páginas
    flash.ts                el mensaje que viaja en la URL hasta el snackbar
    format.ts               fechas, porcentajes y utilidades de presentación
    types.ts                tipos compartidos
    sources/                clientes de fuera: limitless.ts, pokemontcg.ts, pokeapi.ts
  data/
    eventos-europa.ts       los oficiales de Europa, a mano y con sus fuentes
scripts/
  sync-archetypes.ts        trae el catálogo de arquetipos desde Limitless
  create-invite.ts          genera el enlace de la primera invitación
tests/                      cp, rank, rounds, mulligan, cut, badges, conversión,
                            fases de Limitless y v0_5_0 — 122 pruebas
docs/                       esta documentación
```

### Dónde tocar para cada cosa

| Quiero… | Fichero |
|---|---|
| Cambiar qué partidas mueven el Elo | Ajustes → «Qué partidas mueven el Elo» |
| Cambiar cómo se estima la línea de corte | `src/lib/cut.ts` |
| Que el importador de TCG Live entienda otro formato | `src/lib/ptcglive.ts` |
| Cambiar los colores del calendario | `src/lib/calendar.ts` |
| Actualizar los eventos oficiales de Europa | `src/data/eventos-europa.ts`, y volver a importar |
| Corregir la asistencia de un torneo ya creado | La propia ficha del torneo: recalcula sola |
| Cambiar las medallas o sus escalones | `src/lib/badges.ts` |
| Reiniciar el Elo | Ajustes → «Contar el Elo desde» |
| Cambiar el marcador de «Other» | `OtherMark` en `src/components/ui.tsx` y su gemelo SVG en `statistics/Charts.tsx` |
| Cambiar qué torneo sale en «Último torneo» | `fetchLastBigTournament` en `src/lib/sources/limitless.ts` |
| Cambiar colores, sombras, tipografías, espaciados | `src/app/globals.css` |
| Cambiar el aspecto de un KPI o de un esqueleto de carga | `src/components/primitives.tsx` |
| Cambiar lo que se ve mientras carga una pantalla | el `loading.tsx` de esa carpeta |
| Cambiar la pantalla de error | `src/app/(app)/error.tsx` |
| Cambiar cómo se puntúa o desempata | `src/lib/stats.ts` |
| Cambiar qué se puede filtrar | `src/lib/filters.ts` y `src/components/FilterPanel.tsx` |
| Añadir un campo a una partida | `src/db/schema.ts` + `npm run db:push` (solo Neon `dev`) |
| Añadir una pantalla | carpeta nueva en `src/app/(app)/` |
| Cambiar el sistema de acceso | `src/lib/auth.ts` |
| Actualizar las cifras de CP de una temporada | `src/lib/cp.ts` (sección de datos, al final) |
| Añadir algo que escriba en la base | `src/actions/index.ts` |
| Cambiar de fuente de datos de carta | `src/lib/sources/pokemontcg.ts`, y solo ese |

---

## Cómo está montado el diseño

Merece la pena saber tres cosas antes de tocar `globals.css`:

1. **La paleta son variables CSS**, en `:root` y en `[data-theme="dark"]`. `@theme inline` las
   convierte en utilidades de Tailwind (`bg-surface`, `text-muted`), así que casi nunca hace
   falta escribir `dark:`. Cambiar un color es cambiar una línea.
2. **El tema se decide antes de pintar**, con un script síncrono en el `<head>` del layout
   raíz. Por eso no hay fogonazo blanco al cargar en oscuro.
3. **Las sombras también son variables** (`--shadow-1/2/3`). En claro son suaves; en oscuro
   son más duras y llevan un filo claro arriba, porque sobre fondo oscuro una sombra suave
   sencillamente no se ve.

Y una regla que se ha respetado en todas las pantallas nuevas: **lo que se puede calcular no
se simula, y lo que se puede hacer sin JavaScript se hace sin JavaScript**. Los filtros son un
`<form method="get">` y viajan por la URL, así que el enlace se puede compartir, la flecha de
volver atrás funciona y la pantalla carga igual con el móvil en modo ahorro.

---

## Comandos

```bash
npm run dev                  # desarrollo en http://localhost:3000
npm run build                # compilación de producción (lo que hace Vercel)
npm run start                # servir la compilación
npm run db:push              # aplicar el esquema a Neon dev (.env.local); nunca a producción
npm run db:studio            # explorador visual de la base de datos
npm run db:seed              # datos de ejemplo
npm run db:seed -- --empty   # solo configuración y arquetipos, sin partidas inventadas
npm run archetypes:sync      # traer arquetipos desde Limitless
npm run invite               # generar un enlace de invitación desde la terminal
npm test                     # 122 pruebas: CP, ranking, rondas, mulligan, corte, medallas y conversión
npm run ui:add <componente>  # añadir un componente de shadcn/ui (ver abajo)
```

### Sobre shadcn/ui

Está **preparado pero no usado**: existen `components.json`, `src/lib/utils.ts` y el puente de
paleta dentro de `@theme inline`, de modo que un `<Card>` de shadcn sale con los colores de
Arena y no con los grises de fábrica.

```bash
npx shadcn@latest add card tabs select badge input chart
```

**No ejecutes `npx shadcn@latest init`**: reescribe `globals.css` con su propia paleta y se
lleva por delante el sistema de colores. `components.json` ya existe, así que `add` funciona
sin él.

Un detalle del puente: shadcn usa `bg-muted` como color de **fondo** y Arena usa
`--color-muted` como color de **texto**. Los componentes de shadcn que usen `bg-muted` se
verán raros; `card`, `badge` y `chart` no lo usan.

---

## Lo que no se puede hacer, y por qué

Conviene tenerlo escrito, porque son preguntas que vuelven:

- **Pokémon TCG Live no tiene API ni exportación.** No hay forma automática de bajarse tus
  partidas del cliente, y cualquier documento que prometa una integración está prometiendo
  algo que no existe. En la v0.8.0 hubo un importador de texto pegado; se retiró en la
  v0.10.0 porque teclear el historial a mano no lo sostiene nadie.
- **El Elo no está guardado en la base.** Se recalcula desde las partidas en cada carga, así
  que no hay un número que poner a cero. «Reiniciarlo» es poner una fecha de corte en Ajustes,
  y quitarla lo devuelve todo.
- **La API de Limitless solo tiene torneos ONLINE.** `play.limitlesstcg.com` es su plataforma
  de torneos por internet. Los Regionales presenciales —Frankfurt, Niza— se publican en
  `limitlesstcg.com`, que no tiene API: traerlos exigiría raspar HTML, y eso no se hace. Por
  eso la pestaña se llama «Último torneo» y no «Último Regional».
- **No hay sprite de Substitute.** `…/pokemon/gen9/substitute.png` da 404 en su CDN, así que
  los arquetipos «Other» llevan un marcador propio (tres cartas apiladas). Dibujar el muñeco
  de Substitute sería copiar un diseño de Pokémon.
- **La API de Limitless no filtra por país.** El parámetro se ignora y devuelve el listado
  mundial igual. El metagame que se ve es mundial y la pantalla lo dice con esas palabras, en
  vez de poner un selector de región que no haría nada.
- **No se raspa RK9.gg ni pokemon.com.** Sus condiciones prohíben expresamente la extracción
  automatizada, con o sin fines comerciales.
- **pokemontcg.io está deprecada.** No dan claves nuevas y las que existen mueren el 1 de
  marzo de 2027. El reemplazo natural es TCGdex, y cambiarlo es reescribir
  `src/lib/sources/pokemontcg.ts` y nada más.
- **Los CP no se leen de la base: se calculan.** La columna `cp_earned` es una caché y las
  pantallas la ignoran a propósito (`effectiveCp` en `src/lib/cp.ts`). Si alguna vez un número
  de CP no cuadra, el dato a mirar es la **asistencia del torneo** y su **temporada**, no esa
  columna. Lo único que manda sobre el cálculo es un CP puesto a mano.
- **La línea de corte es una estimación.** Sale de suponer que cada ronda la puede ganar
  cualquiera de los dos; el suizo empareja por puntos, así que el reparto real es algo más
  plano. Y quién entra con el récord de la burbuja lo decide la resistencia, que depende de
  contra quién te haya tocado jugar.

---

## Licencia y uso

Proyecto privado de uso personal. Pokémon y Pokémon TCG son marcas de The Pokémon Company,
Nintendo, Game Freak y Creatures Inc.; este proyecto no está afiliado a ninguna de ellas y no
redistribuye datos ni imágenes de cartas: solo referencia sprites e imágenes públicas y guarda
las listas que vosotros peguéis.

No se raspa RK9.gg ni pokemon.com: sus condiciones prohíben expresamente la extracción
automatizada, con o sin fines comerciales. Todo lo que entra de fuera viene de APIs públicas
que lo permiten, o de texto que pegáis vosotros.
