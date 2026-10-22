# PokeArena TCG v0.51.0 — listas de Top Decks, top cut enlazado y ejes

Va sobre la **v0.50.0**. **Sin migración, sin dependencias, sin variables de entorno.**

> **Antes de aplicar nada, lee «Las ramas» abajo.** El código que me mandaste es `development`, y
> `development` está roto: no compila. La v0.50 y esta v0.51 van encima de la v0.49 **limpia**.

---

## 0. Urgente: la contraseña de la base de datos

El zip traía **`.env.local`**, que contiene `DATABASE_URL` con la contraseña de Neon. No lo he
abierto. Aun así, ha salido de tu equipo, así que conviene cambiarla:

1. Neon → tu proyecto → **Roles** → el usuario de la app → **Reset password**.
2. Pega la nueva `DATABASE_URL` en Vercel (**Settings → Environment Variables**) y en tu
   `.env.local`.
3. Vuelve a desplegar.

---

## 1. Las ramas: qué está pasando

Revisé el historial que venía dentro del zip. Esto es lo que hay:

| Rama | Versión | Estado |
|---|---|---|
| `backup-development` | v0.49 | **Limpia.** Compila, 521 tests. La base buena. |
| `V.0.50` | v0.49 | El nombre engaña: **no tiene la v0.50**, es la v0.49 fusionada en el repo de Alex. |
| `development` | v0.49 + **una fusión de la v0.24** | **Rota.** No compila (15 errores). |
| `master` (tu fork) | **v0.24** | Atrasada tres semanas. |
| `upstream/master` (repo de Alex) | v0.49 | Limpia. |

**Qué rompió `development`:** el commit `8442bf5` fusionó tu `master` viejo (v0.24) **dentro** de
`development`. Eso no solo devolvió 20 guías antiguas: **borró código**:

- **Del esquema de la base**: las columnas `games.archetype_a_id` y `archetype_b_id` (el mazo de
  cada juego) y `settings.featured_regional_id`.
- La migración `0015_v0_25_0.sql`, el cálculo de la matriz juego a juego en `stats.ts`, el módulo
  de memoria de filtros, y 7 tests.
- Y volvió el logo antiguo.

Por eso `development` no compila: el código usa columnas que el esquema ya no tiene. Si Vercel
construye desde ahí, cada despliegue falla y producción se queda en la última que sí compiló: de
ahí las versiones distintas que veías.

> ⚠️ **No lances `npm run db:push` desde `development` tal como está.** Drizzle compararía ese
> esquema con Neon y **borraría las columnas del mazo de cada juego, con sus datos.**

## 2. Cómo arreglarlo

Sin borrar nada: primero se guarda lo que hay.

```bash
git fetch --all

# Guardar el development roto, por si acaso
git branch development-roto development

# Volver development a la v0.49 limpia
git checkout development
git reset --hard backup-development

# Aplicar la v0.50: descomprimir su zip encima, y
npm run verificar && npm run build
git add -A && git commit -m "v0.50"

# Aplicar esta v0.51 igual
npm run verificar && npm run build
git add -A && git commit -m "v0.51"

# Subirlo (hace falta forzar porque la historia ha cambiado; --force-with-lease
# se niega si alguien ha subido algo entretanto)
git push --force-with-lease origin development
```

Después, **mira en Vercel → Settings → Git** dos cosas: **qué repositorio** está conectado (el
tuyo o el de Alex) y **cuál es la Production Branch**. Esa rama es la que hay que poner al día, y
**siempre desde `development` hacia ella, nunca al revés**: fusionar una rama atrasada dentro de
`development` es justo lo que lo rompió.

Si producción es `master` de tu fork:

```bash
git checkout master
git reset --hard development
git push --force-with-lease origin master
```

Y como `upstream` es el repositorio de Alex, **habladlo entre los dos**: decidid cuál es la rama
de verdad y que el otro la siga. Cuando esté todo bien, `V.0.50` y `backup-development` se pueden
borrar; mientras tanto, no estorban.

## 3. Cómo pasarme el código

El zip está bien, pero así es mejor:

**Lo normal, para una versión nueva:**

```bash
git archive --format=zip -o arena.zip HEAD
```

Solo mete los ficheros que están en Git. Deja fuera solos `.env.local` (la contraseña),
`node_modules` (cientos de megas) y `.next`.

**Cuando haya dudas de ramas, como ahora:**

```bash
git bundle create arena.bundle --all
```

Un solo fichero con **todas las ramas y todo el historial**, y sin `.env.local` ni
`node_modules`, porque no están en Git. Es lo que me ha dejado diagnosticar esto, pero sin el
riesgo de la contraseña.

Y en el mensaje, dime **de qué rama** sale. Con la v0.50, la etiqueta de versión de la barra
lateral dice también el commit, y en las vistas previas, la rama.

---

## 4. Lo nuevo de la v0.51

### Top Decks: las mejores listas, con sus cartas

En Top Decks, toca cualquier arquetipo. Sale una página con sus mejores listas en los torneos
online de los días que estabas mirando: puesto, récord, torneo y tamaño. Toca una y se despliega
la lista, con la imagen de cada carta.

- **De dónde sale:** de la API oficial de Limitless. Lo comprobé en su documentación: la
  clasificación de cada torneo trae la lista, si el torneo la pedía.
- **Lo que no pude comprobar:** el formato exacto de la lista, porque su documentación lo marca
  como «específico de cada juego» y no lo describe para Pokémon. No lo he supuesto: si llega en
  un formato que no reconozco, la pantalla dice «lista no disponible» en vez de romperse. **Si
  al probarlo ves «lista no disponible» en todas**, dímelo: será que el formato es otro y lo
  ajusto en un momento.
- **Las imágenes** salen del CDN de cartas de Limitless, que es un patrón de terceros sin
  garantías. Si alguna no carga, queda el nombre de la carta en su lugar.
- **Sin nombres**: la API los trae, pero no se enseñan ni se guardan.

### El top cut de «El último Regional», enlazado

Toca cualquier puesto del top cut: lleva a la página del torneo en Limitless, donde está su lista.
Lleva a la página del torneo y no a la del jugador, porque para eso habría que guardar su nombre.
Solo pasa con los Regionales traídos de Limitless; uno pegado a mano no tiene dirección.

### Los ejes

- **Evolución del Elo:** ya no repite fechas. Marca la primera partida de cada día.
- **Ladder:** en escalones en vez de una curva. Un reinicio de rango era una caída de golpe, y la
  curva lo dibujaba como una bajada lenta de una semana.

## 5. Los fallos del iPhone

Siguen sin llegarme. De cada uno: **la pantalla, qué se ve mal o qué no funciona, y la versión de
iOS**. Con una captura basta.

## Cómo deshacerlo

`git revert HEAD`. Nada toca la base de datos.
