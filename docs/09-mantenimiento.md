# 09 · Mantenimiento

Lo que hay que hacer de vez en cuando para que esto siga funcionando dentro de dos años.

---

## Tareas periódicas

| Cada… | Qué |
|---|---|
| Semana de juego | Nada. Registrar partidas es todo. |
| Mes | Exportar una copia de la base de datos (5 minutos). |
| Rotación de Standard (~abril) | `npm run archetypes:sync` para traer los arquetipos nuevos. |
| Temporada nueva | Crear la competición nueva y actualizar el nombre de temporada. |
| 3-6 meses | `npm outdated` y actualizar dependencias. |

---

## Copias de seguridad

Neon guarda un historial reciente que permite restaurar a un punto anterior (*Branches →
Restore*), pero en el plan gratuito la ventana es corta. Una copia propia al mes cubre el
escenario que de verdad da miedo: que alguien borre algo sin querer y no se dé cuenta hasta
semanas después.

### Opción A — desde el panel de Neon

Panel de Neon → tu proyecto → **SQL Editor**, y ejecuta la consulta de exportación que quieras;
descarga el resultado en CSV. Rápido pero manual.

### Opción B — `pg_dump` (recomendada)

Si tienes las herramientas de PostgreSQL instaladas:

```bash
pg_dump "postgresql://…tu DATABASE_URL…" \
  --no-owner --no-acl \
  -f arena-2026-09-07.sql
```

Guarda ese fichero donde guardes las cosas importantes. Para restaurar:

```bash
psql "postgresql://…" -f arena-2026-09-07.sql
```

En Windows, `pg_dump` viene con el instalador de PostgreSQL
(<https://www.postgresql.org/download/windows/>); basta con la parte de *Command Line Tools*.

### Opción C — un script propio

Si prefieres un JSON legible, `loadSnapshot()` ya te da toda la liga:

```ts
// _export.ts en la raíz — bórralo después
import { config } from "dotenv";
config({ path: ".env.local" });
import { loadSnapshot } from "./src/lib/data";
import { writeFileSync } from "node:fs";

const snap = await loadSnapshot();
writeFileSync(`arena-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({
  config: snap.config,
  players: snap.players,
  archetypes: snap.archetypes,
  decks: snap.decks,
  competitions: snap.competitions,
  matches: snap.matches,
  events: snap.events,
}, null, 2));
console.log("Exportado.");
```

```bash
npx tsx _export.ts
```

> **La copia importante es la de la base de datos, no la del código.** El código está en GitHub y
> se puede volver a desplegar en diez minutos. El historial de partidas de tres temporadas no se
> recupera de ningún sitio.

---

## Empezar una temporada nueva

Hay dos maneras, según qué queráis que pase con el historial.

### A) Conservar todo (recomendada)

No borres nada. Crea una competición nueva y ya:

1. *Competiciones* → nueva, con las fechas de la temporada.
2. *Ajustes* → cambia el nombre de **Temporada**.
3. Cierra la competición vieja poniéndola en **Cerrada**.

El ranking por competición te da la clasificación de cada temporada por separado, el histórico
sigue completo, y el **Elo sigue creciendo sobre todo el historial**, que es lo que le da sentido
como medida de nivel a largo plazo.

### B) Empezar el ranking de cero

Si preferís que el Elo se reinicie, hay que borrar las partidas. Antes:

1. **Haz una copia** (arriba).
2. Borra las partidas desde el panel de Neon:

```sql
-- borra los juegos primero, o deja que el CASCADE lo haga
DELETE FROM games;
DELETE FROM matches;
```

Los jugadores, mazos, arquetipos y competiciones se mantienen.

> No hay un botón de "reiniciar temporada" en la interfaz a propósito: es una operación
> irreversible, y hacerla por SQL obliga a pararse a pensar.

---

## Migraciones del esquema

`npm run db:push` compara `src/db/schema.ts` con la base de datos y aplica las diferencias.
Enseña el SQL y pide confirmación.

**Es seguro para:** añadir tablas, añadir columnas nullable o con valor por defecto, añadir
índices.

**Cuidado con:** quitar columnas (se pierden los datos), cambiar tipos (puede fallar si los
datos existentes no encajan), añadir columnas `NOT NULL` sin `default` a tablas con filas
(fallará).

**Antes de un cambio grande:** copia de seguridad, y pruébalo primero contra una rama de Neon
(*Branches → New branch*), que es una copia de la base de datos que no toca la de producción.

Si prefieres migraciones versionadas en vez de `push`, drizzle-kit las soporta
(`drizzle-kit generate` + `drizzle-kit migrate`), y el directorio ya está configurado en
`drizzle.config.ts` (`out: "./drizzle"`). Para un proyecto de dos personas, `push` es suficiente.

---

## Actualizar dependencias

```bash
npm outdated
```

**Parches y versiones menores** (15.5.0 → 15.5.4, 15.5 → 15.6) suelen ser seguros:

```bash
npm update
npm run build     # comprueba
```

**Versiones mayores** (Next 15 → 16, React 19 → 20) piden leer las notas de la versión. No hay
prisa: una versión mayor por detrás no rompe nada y sigue recibiendo parches durante meses.

Después de cualquier actualización: `npm run build`, arranca en local, entra, registra una
partida de prueba y bórrala. Si todo va, `git push`.

---

## Rotación de Standard

Cada primavera rota el formato Standard y el metagame cambia entero.

```bash
npm run archetypes:sync
```

Trae los arquetipos nuevos de Limitless sin tocar los que ya tengáis. Luego, en *Mazos →
Arquetipos*, repasa los tipos de energía de los nuevos (llegan como "incoloro").

Los arquetipos viejos **no se borran**, y está bien así: las partidas de temporadas anteriores
los siguen referenciando y sus estadísticas siguen siendo válidas.

---

## Qué hacer si alguien se va del grupo

*Ajustes → Jugadores → Editar →* desmarca **Activo en el ranking**.

Desaparece del ranking y de los desplegables, pero sus partidas siguen contando para las
estadísticas generales y para el historial de los demás. Si intentas borrarlo teniendo partidas,
la aplicación lo desactiva en vez de borrarlo, precisamente para no dejar el historial huérfano.

---

## Si el proyecto se abandona un año

No pasa nada:

- **GitHub** conserva el código indefinidamente.
- **Neon** no borra proyectos del plan gratuito por inactividad; solo apaga el cómputo.
- **Vercel** mantiene el despliegue.

Al volver: `git pull`, `npm install`, `npm run dev`. Probablemente toque actualizar dependencias,
y la primera visita a la web tardará un par de segundos mientras Neon despierta.

---

## Checklist antes de un cambio importante

- [ ] Copia de seguridad de la base de datos hecha
- [ ] `git pull` y todo commiteado
- [ ] `npm run build` pasa
- [ ] Probado en local: entrar, registrar una partida, verla en el ranking
- [ ] Si toca el esquema, probado antes contra una rama de Neon
- [ ] Avisada la otra persona
