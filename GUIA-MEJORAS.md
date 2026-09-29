# Arena — guía de lo que queda y de las mejoras nuevas

Revisión del 28/09/2026, tras la v0.14.0. He repasado los documentos de estado de la v0.2 a la
v0.12, los planes de estructura, offline y Ciphermaniac, y el reglamento verificado.

Cada punto lleva **esfuerzo** (S = una tarde · M = uno o dos días · L = más) y **por qué
importa**.

---

## 1. Urgente o con fecha

| # | Qué | Esfuerzo | Por qué |
|---|---|---|---|
| 1.1 | **Lanzar `npm run build`** antes de subir la v0.13 | S | Nunca se ha podido ejecutar desde el entorno de Claude. Es la vía por la que se coló el fallo de la v0.9. |
| 1.2 | **Migrar el buscador de cartas de pokemontcg.io a TCGdex** | S–M | pokemontcg.io está deprecada y **sus claves mueren el 1 de marzo de 2027**. Basta con reescribir `src/lib/sources/pokemontcg.ts`. TCGdex es gratis, sin clave y con español. |
| 1.3 | **No volver a meter `.env.local` en los zips** | S | El `2809.zip` ya no está en la carpeta. Para la próxima vez, un zip sin `.env.local`, `node_modules`, `.next` ni `.git` pesa 0,6 MB en vez de 377. Quedan `D:\Cambios\arena-src.zip` y `Descargas\arena-src.zip`, copias del código sin credenciales que puedes borrar. |
| 1.4 | **Probar la sincronización con Limitless en Vercel** | S | Puede tardar unos 20 s. Ajustes declara `maxDuration = 60`; si Vercel la corta, se pulsan «Solo Regionales» y «Solo City Leagues» por separado. |

## 2. Limpieza técnica que evita errores como los de esta versión

| # | Qué | Esfuerzo | Por qué |
|---|---|---|---|
| 2.1 | **Una sola fuente de estructura de torneo** | M | Hoy hay tres: `estructura.ts`, que es la buena y va contra el reglamento; `regionalStructure()` en `cut.ts`; y `suggestedRounds`/`suggestedTopCut`/`roundStage` en `stats.ts`. El fallo de «Cup de 65 = Regional» existía porque las tres no decían lo mismo. Lo correcto es que `TournamentForm` y `AttendanceForm` usen `estructuraDe()`. Como los módulos probados no importan nada, el resultado se pasa por parámetro. |
| 2.2 | **Borrar `CutOutlook.tsx` y el componente `TournamentRounds`** | S | Ninguna página los usa ya: los sustituyen `CaminoAlCorte` y `RondasDelGrupo`. Siguen hablando de un «Top 32» que el reglamento de 2026 no tiene. De `TournamentRounds.tsx` solo se usa `RoundForm`. |
| 2.3 | **Rendimiento del inicio** | M | `loadSnapshot()` carga la base entera en cada petición y ahora el inicio suma `loadMetaIrl()` y la cuota online. Con dos temporadas encima habrá que cachear el snapshot con `unstable_cache` y etiqueta, y paginar Resultados. |

## 3. Pendiente de la especificación del nuevo inicio (28/09)

| # | Qué | Esfuerzo |
|---|---|---|
| 3.1 | **Bloque 1 — Tu resumen** en 4 cifras compactas: partidas de la liga y del mes, las tuyas, tu Elo con variación, y el líder con la distancia. Sustituye a los KPI actuales. | S |
| 3.2 | **Bloque 3 — Conversión de torneos** dentro de un `<details>` cerrado, con el titular en el `<summary>`. | S |
| 3.3 | **Bloque 4 — Las estadísticas de jugadores se mudan** a Estadísticas como una pestaña más: Clasificación, gráficas de Elo, «Últimos resultados». | M |

## 4. Datos del metagame

| # | Qué | Esfuerzo | Por qué |
|---|---|---|---|
| 4.0 | ~~Regionales y City Leagues automáticos~~ | — | **Hecho en la v0.14**, desde limitlesstcg.com y solo con mazos. |
| 4.1 | **Pedir permiso a Ciphermaniac** por su formulario de feedback: que añadan el dominio de Arena y confirmen la ruta base vigente de sus JSON | S (un mensaje) | Con eso, el lado «Global» del inicio se rellena solo, con el campo entero y conversión real a Día 2 en vez de la muestra importada. El panel ya está hecho con la forma `FilaMeta`, así que solo faltaría el adaptador. Hoy no se ha podido comprobar si sus datos vuelven a responder. |
| 4.2 | **Escribir a `contact@limitlesstcg.com`** contando que Arena lee sus páginas de estadísticas | S (un correo) | Su web no tiene condiciones de uso y el robots.txt lo permite, pero avisar es lo correcto y protege el botón. Si dicen que no, se quita la tarjeta de Ajustes y se vuelve a pegar a mano. |
| 4.3 | **Meta del campo entero, no solo del Día 2** | M | El recuento de Limitless es del Día 2. El del Día 1 está en Labs, que republica datos de RK9; solo tendría sentido con permiso explícito. |
| 4.3b | **Pestaña City Leagues en Top Decks** | S | Hoy salen en Estadísticas. En Top Decks se excluyen a propósito para no mezclar el formato japonés. |
| 4.4 | Mapa de calor como rejilla | M | Solo compensa cuando haya más arquetipos; con los de ahora serían casi todo huecos. |

**Líneas rojas que siguen en pie:** nada de raspar RK9.gg ni pokemon.com. Al importar, nunca
se guardan nombres de gente de fuera del grupo.

## 5. Mejoras nuevas, a partir de lo leído en las páginas oficiales

| # | Qué | Esfuerzo | Por qué |
|---|---|---|---|
| 5.1 | **Sobres de premio automáticos** | S–M | La página de Regionales publica la tabla de sobres por puesto y asistencia (de 108 para el 1.º a 9 en los tramos bajos, con su kicker). Hoy los «9 sobres» se escriben a mano en premios; se pueden calcular como los CP. La tabla es la misma en Internacionales. |
| 5.2 | **Desempates de las Travel Awards 2027** | S | A partir del EUIC 2027, los empates en el ranking de CP se rompen por el mejor puesto en Internacional y luego en Regional, dentro del top 16, luego del top 64 y luego cualquiera. Encaja en la pantalla de CP. |
| 5.3 | **Ventanas de Travel Award** | S | Cada Internacional tiene su periodo de clasificación, y el top 4 de CP de la zona en ese periodo recibe ayuda de viaje. Un contador «CP en la ventana del EUIC» es barato con `computeCp` filtrando por fechas. |
| 5.4 | **Premios en metálico del Regional e Internacional** | S | Tablas oficiales por puesto (Masters: de 10.000 $ el 1.º de Regional a 1.000 $ del 17.º al 32.º). Se enseñarían al lado del puesto en la ficha. |
| 5.5 | ~~Bo1 por defecto en los Challenges~~ | — | **Hecho en la v0.14**, confirmado por ti. |
| 5.5b | **Leer el buscador de eventos sin pegar** | — | No es posible de forma legítima: es pokemon.com y prohíbe la extracción automatizada. El importador pegado es la vía. Si un día Play! Pokémon publica un iCal o una API abierta, se enchufa en `importPastedEvents`. |
| 5.6 | **Cuadro visual del top cut** | M | Viene de la v0.2. Ya se conocen las rondas de eliminatoria gracias a `etapaDeRonda`, así que el cuadro puede dibujarse con lo que el grupo apunte. |
| 5.7 | **Enlace al Compendium de PokéGym** desde la ficha de carta o partida | S | Solo enlazar: sus condiciones prohíben copiar. |

## 6. Decidido y aparcado

- **Offline**: está el plan en tres capas (PWA → caché del torneo en IndexedDB → cola de
  cambios). La idempotencia de la cola ya está resuelta por el índice único de rondas. Lo
  aparcaste; `estructura.ts` y `cut.ts` ya sirven en el navegador el día que se haga.
- **Notificaciones push**: no las quieres; solo el snackbar.
- **Resuelto en esta versión**: el BFL de Challenges y Cups es **4 + 4, sin compartir**. La web
  oficial lo dice explícitamente y es lo que ya hacía `cp.ts`.
