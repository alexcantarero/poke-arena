# PokeArena TCG v0.41.0 — texto reparado, amistosos, easter eggs, engranaje y filtros

Va sobre la **v0.40.0**. **Sin migración, sin dependencias, sin variables de entorno.**

> **Importante:** el zip que me mandaste era la v0.39, aunque tienes la v0.40 desplegada. Esta
> versión está construida sobre la 0.40 de verdad. Aplícala sobre tu repo con la 0.40 dentro.
> Si tu repo no la tiene, aplica primero `pokearena-v0.40.0-cambios.zip`.

## Paso 1 — Descomprime

| | Fichero |
|---|---|
| M | `package.json`, `CHANGELOG.md` |
| M | `src/actions/index.ts` ← **texto reparado** + regla de amistosos en el servidor |
| M | `src/app/(app)/layout.tsx`, `src/db/schema.ts` ← **texto reparado** |
| M | `src/components/MatchForm.tsx` ← amistosos con mazo fijo |
| M | `src/components/ThemeToggle.tsx`, `src/app/globals.css` ← easter eggs |
| M | `src/components/icons.tsx` ← engranaje |
| M | `src/app/(app)/torneos/page.tsx` ← filtros |
| M | `src/app/(app)/page.tsx`, `src/lib/ultimosCp.ts`, `tests/ultimosCp.test.ts` ← resultados |

## Paso 2 — Verifica

```bash
npm test          # 450 de 450
npx tsc --noEmit
npm run build
```

Y una comprobación rápida de que el texto quedó bien en tu máquina:

```bash
git diff --stat src/actions/index.ts
grep -c "Ã" src/actions/index.ts   # tiene que salir 0
```

## Paso 3 — Pruébalo

**El texto reparado**
1. Cierra sesión y entra con una contraseña mal: tiene que decir «Correo o contraseña
   incorrectos.», con la ñ bien.
2. En Ajustes, crea una invitación: «Invitación creada. Copia el enlace y mándalo.»

**Amistosos**
3. Registra una partida **sin competición**, Bo3. En cada juego **no** debe salir el selector
   de mazo ni ningún «bloqueado»; abajo, una línea dice que se juega con el mismo mazo.
4. Cambia la competición a una liga: aparecen los selectores por juego y el bloqueo de siempre.

**Easter eggs**
5. En el PC, pulsa el tema en la barra lateral: Solrock o Lunatone asoman **hacia arriba**.
6. En el móvil, en la cabecera: asoman **por debajo**, porque arriba no hay sitio.
7. Cinco clics seguidos: Tadbulb revienta **en el centro, por encima de todo**, también de la
   barra lateral.

**Lo demás**
8. El icono de Ajustes en el menú son dos engranajes.
9. Torneos: pulsa un chip de tipo, luego uno de estado; el primero se mantiene. Cambia la persona
   y se aplica sola, sin botón.
10. Inicio, «Mejores resultados»: alterna «Más CP» y «Recientes». Cambia luego «El último
    Regional» a «Vuestro grupo» y comprueba que el orden de resultados no se pierde.

---

## El texto corrompido: qué pasó

Mientras miraba el formulario de partida encontré **doble codificación en cuatro ficheros**, y
no solo en comentarios: lo veían los usuarios. El error de entrar salía como
`Correo o contraseÃ±a incorrectos.`, y lo mismo en invitaciones, cambio de contraseña y varios
avisos más. No lo habías visto porque casi todos son mensajes de error, que solo salen cuando
algo va mal.

**Cuándo entró:** el commit `2a08264` «Seguridad Fase 1», del 9 de octubre. Antes de él el
fichero estaba limpio. Esa sesión leyó el fichero como Windows-1252 en vez de UTF-8 y lo volvió
a guardar, y cada carácter con acento se convirtió en dos o tres caracteres raros.

**Por qué no lo restauré desde Git:** encima de ese commit hubo cambios reales (filtros, el
selector de Regional, la v0.29, los míos de la 0.36). Restaurar el fichero viejo los habría
borrado.

**Cómo lo arreglé:** deshaciendo la codificación por tramos de caracteres, no por líneas
enteras, para no estropear el texto que ya estaba bien al lado del roto. Es seguro con el texto
correcto por una razón concreta: una «ó» bien escrita, pasada a Windows-1252, es un byte suelto
que no es UTF-8 válido, así que el intento de deshacerla falla y se deja como estaba. Solo cambia
lo que al deshacer un nivel vuelve a ser UTF-8 válido.

**Cómo lo comprobé:** contra la última versión limpia del historial (`a4805a9`). De las 359
líneas con acentos que tenía, **353 vuelven exactamente a como eran**, carácter a carácter. Las
otras 6 son líneas que se cambiaron de verdad en commits posteriores.

**Para que no vuelva a pasar:** si usas PowerShell para tocar ficheros, `Set-Content` sin
`-Encoding utf8` es la causa más habitual de esto. Y vale la pena añadir al `CLAUDE.md` una línea
para los agentes: «guarda siempre en UTF-8 sin BOM y comprueba que `grep -c "Ã"` da 0 antes de
commitear».

## Las decisiones

**Amistosos.** El servidor ya hacía bien la regla: solo aplicaba el bloqueo con competición. El
fallo era del formulario, que pedía un mazo por juego y enseñaba el «1 bloqueado» también en
los amistosos. Ahora el formulario sabe si la partida es de liga, y el servidor además descarta
mazos por juego en un amistoso aunque lleguen. Vacío significa «el de la serie», que es la regla.

**Easter eggs.** La causa de los dos fallos era la misma: el botón vive dentro de contenedores
que recortan (`overflow-y-auto`) y que atrapan el apilamiento (`sticky`). Ningún `z-index`
escapa de eso, por alto que sea. Con un portal en el `<body>` las dos cosas se arreglan solas.
La dirección se decide al pulsar, midiendo dónde está el botón en ese momento.

**Engranaje.** Generado por cálculo y no a ojo, y comprobado renderizándolo a 20 px en los dos
temas. Hubo que ajustarlo dos veces: al principio los dos engranajes se fundían donde se tocaban,
y luego quedaron tan separados que ya no parecían engranar.

**Mejores resultados.** Ordenar por puesto mentía sobre el peso de cada resultado. Ordenar por
CP pone cada cosa en su sitio, y «Recientes» cubre la otra pregunta: qué acaba de pasar.

## Cómo deshacerlo

`git revert HEAD`. Nada toca la base de datos.

**No deshagas solo la reparación del texto**: devolvería los caracteres rotos a la pantalla de
entrar.
