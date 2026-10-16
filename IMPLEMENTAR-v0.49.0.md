# PokeArena TCG v0.49.0 — la app en inglés

Va sobre la **v0.48.0**. **Sin migración, sin dependencias, sin variables de entorno.**

## Paso 1 — Descomprime

Son **111 ficheros**: casi toda la carpeta `src/`, porque cada pantalla tiene ahora sus textos
en el diccionario. Lo más importante:

| | Fichero |
|---|---|
| U | `src/components/LangProvider.tsx` ← el idioma para los componentes de cliente |
| M | `src/lib/i18n.ts` ← ~1.000 claves nuevas, en los dos idiomas, y el interruptor encendido |
| M | `src/actions/_comun.ts` ← `msj()`, los avisos del servidor traducidos |
| M | `src/app/layout.tsx`, `src/app/(app)/layout.tsx` |
| M | `scripts/verificar-i18n.mjs` ← 113 ficheros blindados |
| M | el resto: pantallas y componentes, con sus textos cambiados por `tr(lng, "…")` |

```bash
git rm IMPLEMENTAR-v0.48.0.md   # cuando la hayas aplicado
```

## Paso 2 — Verifica

```bash
npm run verificar   # codificación + «use server» + i18n estricto + 521 tests + tsc
npm run build
npm run dev
```

**Lo que he comprobado aquí:** `tsc` limpio, los 521 tests, y dos cosas que ni `tsc` ni los
tests vigilan y que he revisado por mi cuenta:

- **Que cada `useLang()` es la primera línea de su componente.** Un *hook* detrás de un `return`
  condicional rompe React en el navegador. Revisados todos, uno a uno.
- **Que no he traducido ningún valor.** Una cadena que se compara en otro sitio (`fase === "Día 2"`)
  no se puede traducir sin romper la lógica en silencio. No toqué las 87 que estaban junto a una
  comparación, y busqué activamente el caso traducida-en-un-sitio-comparada-en-otro. Apareció uno
  en el camino al corte, y está corregido.

**Lo que no:** el navegador. Si al usar la app algo falla con «Rendered more hooks» o «hooks
order», mándame la pantalla: sería un *hook* fuera de sitio que se me ha escapado.

## Paso 3 — Míralo en inglés

El botón **EN** vuelve a salir en la barra para todo el mundo. Púlsalo y recorre:

1. **Inicio, Ranking, Resultados, Torneos, Liga, Calendario, Estadísticas, Top Decks, Perfil y
   Ajustes**: los títulos, botones, avisos de «vacío», filtros y formularios en inglés.
2. **Guarda algo** (una partida, el perfil): el aviso de abajo tiene que salir en inglés.
3. **Entrar y registrarse**: también en inglés, aunque no estén dentro de la app.
4. Vuelve a **ES**: todo en español, como siempre.

---

## Lo que sigue en español, y por qué

Me pediste el inglés completo en una sola versión, así que te debo un número exacto de lo que
no he llegado a cubrir:

- **Unas 134 frases montadas con un valor dentro**, como «12 jugadores» o «3 de 8 listas».
  Traducirlas bien exige convertir cada una en una frase con huecos, y el orden de las palabras
  cambia entre idiomas: no se puede automatizar como el resto sin que alguna salga mal.
- **Textos dentro de constantes y de valores por defecto** (por ejemplo, las etiquetas de los
  resultados de una ronda): `tsc` rechazó 33 de estas sustituciones porque ahí el idioma todavía
  no existe, y las devolví a su texto. Hay que moverlas dentro del componente.
- **7 textos pequeños de `ui.tsx`**, como «Sin mazo» o «Jugador borrado». Ese fichero se usa a la
  vez desde el cliente y desde el servidor, en cientos de sitios, y ahí no vale ninguna de las dos
  formas de leer el idioma. Hacen falta las llamadas una por una.
- **Los números y las fechas**, que siguen en formato español: en inglés se verá «54,3%» con coma.
- **Dos avisos del servidor** que se montan pegando trozos.

En pantalla, son trozos sueltos: lo grande —títulos, botones, formularios, avisos— está en inglés.
Si quieres, en una **v0.50** cierro estos cinco puntos.

## Cómo deshacerlo

Para apagar el inglés sin deshacer nada: `INGLES_DISPONIBLE = false` en `src/lib/i18n.ts`.
Para deshacerlo del todo: `git revert HEAD`. Nada toca la base de datos.
