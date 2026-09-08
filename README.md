# Arena — liga privada de Pokémon TCG

Web para llevar vuestra liga entre amigos: ranking con Elo y resistencia, resultados juego a
juego, calendario, estadísticas de metagame con matriz de emparejamientos, torneos de fuera con
recuento de Championship Points y un perfil por jugador. Pensada para el móvil y para un grupo
cerrado, pero sin nada que impida crecer.

```
Inicio · Ranking · Resultados · Calendario · Estadísticas · Torneos · Perfil · Mazos · Competiciones · Ajustes
```

| | |
|---|---|
| **Lenguaje** | TypeScript de punta a punta |
| **Framework** | Next.js 15 — App Router, Server Components, Server Actions |
| **Base de datos** | PostgreSQL en Neon, con Drizzle ORM |
| **Estilos** | Tailwind CSS v4, configurado desde CSS — sin `tailwind.config.js` |
| **Diseño** | mobile-first: barra inferior en el móvil, barra lateral en escritorio, PWA instalable |
| **Acceso** | cuenta por jugador (correo + contraseña con scrypt), alta por enlace de invitación, sesión en cookie firmada |
| **Hosting** | GitHub + Vercel + Neon, todo en plan gratuito |
| **Coste** | 0 € |

---

## Arranque rápido

Si ya tienes Node.js 20+ y una base de datos en Neon:

```bash
npm install
cp .env.example .env.local     # y rellena DATABASE_URL, SESSION_SECRET y APP_URL
npm run db:push                # crea las tablas
npm run db:seed                # datos de ejemplo (opcional)
npm run invite                 # imprime el enlace para crear la primera cuenta
npm run dev                    # http://localhost:3000
```

¿Empiezas de cero en un ordenador nuevo? Ve al **[manual de instalación](docs/01-instalacion.md)**:
está escrito paso a paso, sin dar nada por sabido.

---

## Documentación

### Para ponerlo en marcha

| Documento | De qué trata |
|---|---|
| **[01 · Instalación en otro PC](docs/01-instalacion.md)** | Desde cero en Windows, macOS o Linux: Node, Git, Neon, variables de entorno y primer arranque, con una comprobación después de cada paso. |
| **[06 · Despliegue](docs/06-despliegue.md)** | Subirlo a internet gratis con GitHub + Vercel + Neon, y cómo lo lleváis dos personas. |

### Para usarlo

| Documento | De qué trata |
|---|---|
| **[02 · Manual de usuario](docs/02-manual-de-usuario.md)** | Pantalla por pantalla: entrar, registrar mazos y partidas, montar competiciones, leer el ranking y las estadísticas. |
| **[05 · Cómo se calcula todo](docs/05-estadisticas.md)** | Puntos, %V, resistencia, Elo, matriz de emparejamientos y ventaja del primer turno, con ejemplos numéricos. |

### Para mantenerlo y modificarlo

| Documento | De qué trata |
|---|---|
| **[03 · Arquitectura](docs/03-arquitectura.md)** | Por qué este stack, cómo viaja un dato desde el formulario hasta la pantalla, y qué hace cada carpeta. |
| **[04 · Modelo de datos](docs/04-modelo-de-datos.md)** | Las tablas, columna a columna, con sus relaciones y las decisiones detrás. |
| **[07 · Guía de desarrollo](docs/07-guia-de-desarrollo.md)** | Recetas concretas: añadir un campo, una pantalla, cambiar una fórmula, cambiar los colores. |
| **[08 · Datos externos y APIs](docs/08-datos-externos.md)** | Sprites y catálogo de Limitless, formatos de decklist que se importan, y qué APIs de cartas usar si algún día queréis imágenes. |
| **[09 · Mantenimiento](docs/09-mantenimiento.md)** | Copias de seguridad, empezar una temporada nueva, migraciones y tareas periódicas. |
| **[10 · Solución de problemas](docs/10-solucion-de-problemas.md)** | Los errores concretos que puedes encontrarte y qué hacer con cada uno. |

También: **[CHANGELOG.md](CHANGELOG.md)**.

---

## Estructura del proyecto

```
src/
  app/
    layout.tsx              envoltorio HTML y tipografías
    globals.css             el diseño entero: paleta, tema claro/oscuro, clases compuestas
    entrar/                 pantalla de acceso (correo y contraseña)
    registro/[token]/       alta desde un enlace de invitación
    (app)/                  todo lo que va detrás del acceso
      layout.tsx            navegación y comprobación de sesión
      page.tsx              Inicio
      ranking/ resultados/ calendario/ estadisticas/ torneos/
      perfil/[id]/ mazos/ competiciones/ partidas/ mas/ ajustes/
  components/               piezas de interfaz reutilizables
  actions/index.ts          Server Actions: todo lo que escribe en la base de datos
  db/
    schema.ts               las tablas
    index.ts                conexión (perezosa)
    seed.ts                 datos de ejemplo
  lib/
    stats.ts                motor de estadísticas (funciones puras)
    cp.ts                   Championship Points: tablas por temporada y Best Finish Limit
    decklist.ts             importador de listas PTCG Live / PTCGO / Limitless
    auth.ts                 contraseñas, sesión por cookie firmada e invitaciones
    pokemon.ts              tipos de energía, sprites y catálogo de arquetipos
    data.ts                 carga de datos para las páginas
    format.ts               fechas, porcentajes y utilidades de presentación
    types.ts                tipos compartidos
scripts/
  sync-archetypes.ts        trae el catálogo de arquetipos desde Limitless
  create-invite.ts          genera el enlace de la primera invitación
tests/
  cp.test.ts                pruebas del motor de Championship Points
docs/                       esta documentación
```

### Dónde tocar para cada cosa

| Quiero… | Fichero | Guía |
|---|---|---|
| Cambiar colores, tipografías, espaciados | `src/app/globals.css` | [07](docs/07-guia-de-desarrollo.md#cambiar-los-colores-o-la-tipografía) |
| Cambiar cómo se puntúa o desempata | `src/lib/stats.ts` | [07](docs/07-guia-de-desarrollo.md#cambiar-una-fórmula) |
| Añadir un campo a una partida | `src/db/schema.ts` + `npm run db:push` | [07](docs/07-guia-de-desarrollo.md#añadir-un-campo-a-una-tabla) |
| Añadir una pantalla | carpeta nueva en `src/app/(app)/` | [07](docs/07-guia-de-desarrollo.md#añadir-una-pantalla) |
| Cambiar el sistema de acceso | `src/lib/auth.ts` | [03](docs/03-arquitectura.md#acceso-y-sesión) |
| Actualizar las cifras de CP de una temporada | `src/lib/cp.ts` (sección de datos, al final) | [09](docs/09-mantenimiento.md#actualizar-las-tablas-de-championship-points) |
| Añadir algo que escriba en la base | `src/actions/index.ts` | [07](docs/07-guia-de-desarrollo.md#añadir-una-acción-que-escriba-en-la-base) |

---

## Comandos

```bash
npm run dev                  # desarrollo en http://localhost:3000
npm run build                # compilación de producción (lo que hace Vercel)
npm run start                # servir la compilación
npm run db:push              # aplicar el esquema a la base de datos
npm run db:studio            # explorador visual de la base de datos
npm run db:seed              # datos de ejemplo
npm run db:seed -- --empty   # solo configuración y arquetipos, sin partidas inventadas
npm run archetypes:sync      # traer arquetipos desde Limitless
npm run invite               # generar un enlace de invitación desde la terminal
npm test                     # pruebas del motor de Championship Points
```

---

## Licencia y uso

Proyecto privado de uso personal. Pokémon y Pokémon TCG son marcas de The Pokémon Company,
Nintendo, Game Freak y Creatures Inc.; este proyecto no está afiliado a ninguna de ellas y no
redistribuye datos ni imágenes de cartas: solo referencia sprites públicos de Limitless y
guarda las listas que vosotros peguéis.
