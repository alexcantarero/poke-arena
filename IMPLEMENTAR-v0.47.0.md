# PokeArena TCG v0.47.0 — las seis mejoras y los umbrales de paso

**Lleva migración de base de datos.** Sin dependencias nuevas.

## Antes de nada: el orden

Va encima de la **v0.46**, que va encima de la **v0.45**. Cada una lleva su migración:

| Versión | Migración |
|---|---|
| 0.45 | `drizzle/0018_v0_45_0.sql` |
| 0.47 | `drizzle/0019_v0_47_0.sql` |

Aplica en orden: 0.45 → 0.46 → 0.47, y lanza las dos migraciones en la rama `dev` de Neon.

## Paso 1 — Descomprime y borra lo que sobra

```bash
git rm src/components/TournamentRounds.tsx
git rm IMPLEMENTAR-v0.45.0.md IMPLEMENTAR-v0.46.0.md   # cuando las hayas aplicado
```

`TournamentRounds.tsx` lo sustituye `RoundForm.tsx`. Si se quedara, no rompe nada, pero son
724 líneas muertas.

## Paso 2 — La migración

```sql
-- drizzle/0019_v0_47_0.sql, en el SQL Editor de Neon, primero en `dev`
```

Tres columnas que pueden quedar vacías. No cambia ningún dato.

## Paso 3 — Verifica (y aquí el build importa más que nunca)

```bash
npm run verificar   # codificación + «use server» + 515 tests + tsc
npm run build       # ← el que de verdad valida el punto 1
npm run dev
```

**Lo que he podido comprobar aquí:** que `tsc` compila; que siguen siendo las mismas 60 acciones;
que cada uno de los 97 trozos del fichero original está en algún fichero nuevo exactamente una
vez; y que ningún fichero `"use server"` exporta otra cosa que funciones `async`.

**Lo que no:** el build de Next. Es el único que comprueba de verdad cómo se conectan las Server
Actions con los componentes. Si `npm run build` falla con un error que mencione `"use server"`,
`server action` o `src/actions/`, **usa la salida de emergencia** de abajo y mándame el error.

### La salida de emergencia del punto 1

Va en el zip una copia del `index.ts` de antes de partirlo, con todo lo demás de esta versión ya
dentro:

```bash
cp docs/respaldo/actions-index-v0.47.ts.txt src/actions/index.ts
rm src/actions/_comun.ts src/actions/cuenta.ts src/actions/mazos.ts src/actions/partidas.ts \
   src/actions/torneos.ts src/actions/ligas.ts src/actions/calendario.ts \
   src/actions/ajustes.ts src/actions/metagame.ts
npm run build
```

Con eso vuelves al fichero único y conservas el resto de la v0.47. Solo se pierde el reparto.

## Paso 4 — Pruébalo

**Las acciones** (punto 1). No cambia nada visible: cualquier botón que guarde algo tiene que
seguir funcionando. Prueba unos cuantos de temas distintos: registrar una partida, apuntar una
ronda de torneo, crear un evento, guardar tu perfil.

**`/torneos`** (punto 6). Tiene que verse igual que antes, con los mismos CP. Filtra por una
persona y comprueba que salen sus rondas.

**El inglés** (punto 5). El botón EN ya no está. Si tenías la app en inglés, ahora sale en español.

**Los umbrales**
1. Edita el Moujii's Dojo (o crea uno online con segunda fase).
2. En «Estructura», con la fase 2 activada: «Para pasar a la fase 2: **16** puntos, o el top
   **8**» y «Para el top cut: **24** puntos».
3. En la ficha, bajo las pestañas del camino al corte, sale la regla en una frase.
4. Apunta rondas hasta quedarte por debajo de 16 tras la fase 1: tiene que salir **«depende»**,
   no «fuera». Con 16 o más, «dentro».

---

## Lo que he hecho

### 1. `actions/index.ts`, partido por temas

Eran 3.088 líneas con 60 acciones. Ahora son ocho ficheros por tema —cuenta, mazos, partidas,
torneos, ligas, calendario, ajustes y metagame—, más `_comun.ts` con los 37 ayudantes que
comparten. `index.ts` se queda como barril que reexporta, así que **ningún componente ha tenido
que cambiar sus importaciones**.

No lo he partido a mano: lo hizo un script que primero analizó quién llama a quién. Ningún
ayudante llama a ninguna acción, así que no hay ciclos. Cuatro acciones llaman a otras (apuntar
una ronda de torneo usa `saveMatch`, por ejemplo), y esa importación entre ficheros está puesta.

Y una regla nueva en `npm run verificar`: un fichero `"use server"` solo puede exportar funciones
`async`. Si alguien exporta ahí una constante, compila y pasa los tests, pero el build falla.

### 2. Los formularios, sin `lib/stats`

`TournamentForm` y `CompetitionForm` importaban `lib/stats` (1.284 líneas) para dos funciones
de sugerir rondas. Como son componentes de cliente, eso se llevaba el módulo entero al navegador.
Las dos funciones viven ahora en `sugerencias.ts`, y ya **ningún componente de cliente importa
valores de `lib/stats`**.

No las reexporto desde `stats.ts` a propósito: por la regla de este proyecto, un módulo que se
prueba con Node no puede importar otro sin romper o los tests o el build.

### 3. Código muerto

`TournamentRounds.tsx` tenía 724 líneas y el componente que le daba nombre no se pintaba en
ningún sitio; solo se usaba `RoundForm`, que ahora tiene su fichero. Con él se va `roundStage()`,
que solo usaba ese componente, y sus nueve pruebas, que probaban código que nadie ejecutaba.

### 4. Una sola `fechaCorta`

Había tres, y dos escribían la misma fecha distinto («19 sep» y «19 sept»). Ahora hay una en
`format.ts`. La tercera no era una fecha corta sino recortar a día, y se llama `soloDia`.

### 5. El inglés, apagado

Solo había 52 textos traducidos y 17 pantallas sin ninguno: media app en un idioma y media en
otro es peor que una entera en español. Es un interruptor en un solo sitio (`INGLES_DISPONIBLE`
en `lib/i18n.ts`), y nada se borra. Lo importante: quien tenía la cookie en inglés ve español,
porque si no se habría quedado atascado sin botón para volver.

### 6. `/torneos`, sin la base entera

Lo que lo bloqueaba era `playerCp`, que pedía el snapshot entero. Mirándolo, solo usaba tres
cosas. Así que **el motor de CP no se ha tocado**: solo su parámetro dice ahora que necesita esas
tres, y quien le pasaba el snapshot entero sigue funcionando igual. `/torneos` carga torneos,
resultados, jugadores y solo las rondas de torneo, sin las jornadas de liga ni los amistosos.

## Los umbrales de paso

La regla que me diste: pasan los que llegan a los puntos **o** el top N, lo que dé más gente.

Eso cambia el veredicto de una forma que no es evidente. Con los puntos, se pasa **seguro**. Pero
sin ellos **no se está fuera**: si menos de 8 personas llegan a 16, pasan los 8 primeros, y con
13 puntos se puede entrar. Como la app no sabe cómo le ha ido a los demás, lo honesto es decir
**«depende»**. Decir «fuera» sería decirle a alguien que no ha entrado cuando quizá sí.

Solo se usan con estructura propia. En un torneo oficial, el reglamento ya los pone.

## Los torneos vacíos

Ya funcionaban como dices desde la v0.19: a los tres días de pasada su fecha, sin participación,
se borran. No he cambiado nada.

## Cómo deshacerlo

`git revert HEAD`, y para la base:

```sql
ALTER TABLE tournaments DROP CONSTRAINT IF EXISTS tournaments_umbrales_rango;
ALTER TABLE tournaments DROP COLUMN IF EXISTS phase2_points,
  DROP COLUMN IF EXISTS phase2_top, DROP COLUMN IF EXISTS cut_points;
```
