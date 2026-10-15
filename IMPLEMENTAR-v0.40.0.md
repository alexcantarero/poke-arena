# PokeArena TCG v0.40.0 — pestaña de Mazos, matriz completa, CP y easter eggs

Va sobre la **v0.39.0**. **Sin migración, sin dependencias, sin variables de entorno.**

## Antes de nada: tu captura del menú

En la captura, «Mazos» sigue en la barra lateral. **El código ya lo quita desde la v0.38**: la
captura es del despliegue anterior. En cuanto despliegues esta versión desaparece del menú y
pasa a ser la tercera pestaña de Top Decks.

## Paso 1 — Descomprime

| | Fichero |
|---|---|
| M | `package.json`, `CHANGELOG.md` |
| M | `src/app/(app)/page.tsx` ← CP en los mejores resultados |
| M | `src/app/(app)/topdecks/page.tsx`, `src/app/(app)/mazos/page.tsx` |
| M | `src/components/Matrix.tsx`, `src/components/LigaStats.tsx` |
| M | `src/components/Nav.tsx`, `src/components/ThemeToggle.tsx` |
| M | `src/app/globals.css` |
| U | `src/components/MetaTabs.tsx` |
| U | `src/lib/rafaga.ts` |
| U | `tests/rafaga.test.ts` |

## Paso 2 — Verifica

```bash
npm test          # 445 de 445
npx tsc --noEmit
npm run build
```

## Paso 3 — Pruébalo

**Top Decks y Mazos**
1. Entra en Top Decks: tres pestañas, Online · Presencial · Mazos.
2. Pulsa Mazos: estás en la biblioteca, **con las mismas tres pestañas arriba**, y en el menú
   lateral se ilumina Top Decks.
3. Desde Mazos, pulsa Online: vuelves al metagame.

**La matriz de enfrentamientos entre mazos** (en la ficha de una liga)
4. En el PC: debe ocupar todo el ancho de la tarjeta, con las columnas repartidas.
5. En el móvil: la columna de la izquierda solo lleva los sprites, y la tabla se desplaza de
   lado si no cabe. **No debe aplastarse** hasta que no se lean los números.

**Mejores resultados de torneos** (Inicio)
6. Cada fila: a la derecha los CP en grande; debajo del torneo, una etiqueta con el tipo y
   otra con el puesto. Un torneo que no reparte CP enseña un guion, no «+0».
7. **Contrasta un CP con la ficha de su torneo.** Tienen que coincidir: salen de la misma
   función. Si no coinciden, dímelo.

**Easter eggs**
8. Pulsa el botón de tema una vez: asoma Solrock (si pasas a claro) o Lunatone (a oscuro).
9. Púlsalo cinco veces seguidas, rápido: Tadbulb se hincha, tiembla y revienta en chispas.
10. **Ajustes → Apariencia → animaciones «No»**, y repite: el Pokémon tiene que salir quieto,
    no desaparecer.

## Una cosa que no he podido comprobar

**El sprite de Tadbulb.** Solrock y Lunatone sé que existen en el CDN de Limitless porque tus
mazos ya los usan (Ceruledge / Solrock, Ceruledge / Lunatone). Tadbulb es de novena generación
y debería estar, pero desde aquí no hay red para comprobarlo. Si no existiera, el `<img>` se
oculta solo y verás las chispas y el destello sin el Pokémon. Si pasa, dime el slug que use
Limitless y lo cambio.

---

## Lo que he hecho, y por qué así

### La pestaña de Mazos

La tarjeta de la v0.38 había que encontrarla bajando hasta el final de Top Decks. Como pestaña
se ve nada más entrar y es el mismo gesto que las otras dos.

Lo importante es que **las pestañas salen también en `/mazos`**. Sin eso, «Mazos» sería una
puerta de un solo sentido: entras a la biblioteca y no hay forma de volver al metagame sin ir
al menú. Por eso las tres pestañas son un componente compartido (`MetaTabs`) y no un trozo de
JSX dentro de Top Decks.

Son un `<nav>` con `aria-current` y no un `tablist` con `role="tab"`: las tres llevan a otras
páginas. Un lector de pantalla que oye «pestaña» espera que el contenido cambie sin salir de la
página, y aquí se sale.

### La matriz a ancho completo

Compartía fila con «Mazos más jugados» en una rejilla de dos columnas, así que se quedaba con
media tarjeta para diez columnas de rivales. Ahora va sola a ancho completo, y la tabla es
`w-full min-w-max`: llena la tarjeta cuando cabe y se desplaza cuando no.

**Una trampa que evité:** la forma obvia de repartir columnas a partes iguales es `table-fixed`,
pero con reparto fijo el navegador ignora el `min-width` de las celdas. En el móvil habría
aplastado las columnas hasta hacerlas ilegibles en lugar de dejar que la tabla se desplazara.

En el móvil la columna de nombres se comía media pantalla. Va solo con sprites, como ya iban
las cabeceras de columna; el nombre sigue en el `title` y para el lector de pantalla.

### Los CP en los mejores resultados

Salen de `effectiveCp()`, **la misma función** que usan el perfil y la ficha del torneo. No se
lee la columna `cp_earned`: leerla en crudo es exactamente el fallo de la v0.9.0, donde el
perfil decía una cifra y el torneo otra. Un CP metido a mano sigue mandando, porque
`effectiveCp` ya lo respeta.

### Los easter eggs

**Los Pokémon no se dibujan.** Son los sprites del mismo CDN que la app ya carga para cada
arquetipo. Dibujarlos sería copiar un diseño de Pokémon, que es la regla que fijasteis en la
v0.11 con el marcador de «Other». Lo único propio es la animación, que es CSS genérico.

La regla de qué cuenta como «machacar el botón» está en `lib/rafaga.ts`, con pruebas, porque
es justo lo que falla en silencio: un umbral mal puesto y el egg no sale nunca, o sale siempre.
Revienta **una vez por ráfaga**, no en cada clic de después.

**Dos decisiones de cuidado:**

- **Un único destello, suave y radial**, no un fogonazo blanco a pantalla completa. Quien llega
  ahí acaba de cambiar la pantalla entera de claro a oscuro cinco veces. Y la ráfaga se
  completa a dos cambios por segundo, por debajo de los tres que marcan el riesgo para personas
  con fotosensibilidad: no se premia pulsar más rápido. El ritmo real lo marca quien pulsa, eso
  no lo controla la app; lo que sí controla es no exigirlo.
- **Con las animaciones apagadas, el Pokémon sale quieto.** Aquí encontré un fallo mío antes de
  entregarlo: la regla global de la v0.22 deja cada animación en su **último** fotograma, y el
  último de estas es opacidad 0. Sin una excepción, quien tiene el movimiento apagado no habría
  visto nunca el Pokémon. La excepción está al final de `globals.css`.

## Cómo deshacerlo

`git revert HEAD`. Nada toca la base de datos.
