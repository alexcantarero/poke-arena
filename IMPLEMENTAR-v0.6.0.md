# Cómo meter la v0.6.0 en `develop`

Va sobre la v0.5.0. El zip trae **solo los ficheros que cambian**, con la estructura del
proyecto: descomprímelo encima y sobrescribe.

> **Esta versión no compila sin `npm install` antes.** Trae dependencias nuevas. Si la subes a
> Vercel sin instalarlas, el build falla. El orden del punto 1 no es opcional.

```bash
git checkout develop
git pull
unzip -o arena-v0.6.0-cambios.zip -d .
git status          # 23 ficheros: 10 modificados y 13 nuevos
```

---

## 1. Las dependencias (esto primero)

```bash
npm install
```

Lo nuevo, con las versiones comprobadas en el registro de npm el 16/09/2026:

| Paquete | Versión | Para qué |
|---|---|---|
| `recharts` | 3.10.1 | Las gráficas. Ya declara React 19 en sus peer deps, así que **no hace falta `--legacy-peer-deps`**. |
| `lucide-react` | 1.46.0 | Iconos del selector de fuente. Ojo: ya no es `0.x`, pasó a 1.x. |
| `class-variance-authority` | 0.7.1 | Lo pide shadcn. |
| `cn` | 0.3.0 | Lo pide shadcn (ver abajo). |
| `tw-animate-css` | 1.4.0 | Sustituye a `tailwindcss-animate` en Tailwind v4. |

### Sobre shadcn/ui

Dijiste que podías ejecutar los `npx` al terminar, así que lo he dejado **preparado pero no
usado**: `components.json`, `src/lib/utils.ts` y el puente de paleta en `globals.css` ya están.
Para añadir componentes:

```bash
npx shadcn@latest add card tabs select toggle-group badge input chart
```

**No ejecutes `npx shadcn@latest init`.** El `init` reescribe `globals.css` con su paleta, y eso
se llevaría por delante el sistema de colores de Arena. `components.json` ya existe, así que
`add` funciona sin él.

Cuatro correcciones al documento que me pasaste, comprobadas contra la documentación oficial:

- `npx shadcn-ui@latest` → **obsoleto**, el paquete está marcado como deprecated. Es
  `npx shadcn@latest`.
- `add data-table` → **no existe**. No es un componente, es una guía. Lo que hay es
  `add table` + `npm install @tanstack/react-table`.
- `lib/utils.ts` con `clsx` + `tailwind-merge` → desde septiembre de 2026 shadcn usa el paquete
  `cn`, y su `utils.ts` es un re-export. Así está escrito el mío.
- `lucide-react ^0.4xx` → hoy es `1.46.0`.

**Por qué no hay componentes de shadcn en las pantallas nuevas.** Las he escrito con el sistema
de Arena y con Recharts. Dos razones concretas, no una manía:

1. No he podido verificar desde aquí qué genera exactamente `shadcn add` en la v4 del CLI —cambió
   a "bases" (Base UI por defecto, Radix o React Aria) y el registro no declara los paquetes
   subyacentes—. Escribir imports contra ficheros que genera un CLI que no puedo ejecutar, en un
   repo que está en producción, es apostar con tu despliegue.
2. Los filtros **tienen que funcionar sin JavaScript y ser compartibles por enlace** —van por
   URL— y un `<Select>` de Base UI no hace eso.

Con el puente de paleta ya puesto, cuando añadas un `<Card>` de shadcn saldrá con los colores de
Arena y no con los grises de fábrica. Si quieres que cablee sus componentes en alguna pantalla,
ejecuta el `add`, pásame lo que te haya generado y lo hago.

**Un detalle del puente**: shadcn usa `bg-muted` como color de fondo y Arena usa `--color-muted`
como color de texto. Los componentes de shadcn que usen `bg-muted` se verán raros. `card`,
`badge` y `chart` no lo usan, así que con esos no hay problema.

---

## 2. La base de datos

**Nada.** Esta versión no toca el esquema. No hay migración que correr.

---

## 3. Compilar

```bash
npm test        # 59 pruebas (44 de antes + 15 nuevas del simulador)
npm run build
npm run dev
```

Sigue el aviso de siempre: aquí npm está bloqueado, así que `npm run build` es la primera vez
que Next ve esto de verdad. Lo que sí ha pasado: las 59 pruebas, y el comprobador estático de
imports sobre los 93 ficheros. Si el build saca algo, pásamelo.

---

## 4. Qué probar, y en este orden

1. **El snackbar.** Crea un torneo. Tiene que salir un aviso abajo —abajo del todo en el móvil,
   abajo a la derecha en escritorio— diciendo «Torneo creado.». Este era el bug: el componente
   estaba escrito pero no montado en ninguna parte, así que no aparecía nunca. Prueba también a
   guardar un mazo, registrar una partida y guardar los ajustes.
2. **Resultados → Filtros.** Ahora hay un desplegable de **Torneo**, que era lo que faltaba.
   Pon un rango de fechas, aplica, y mira que la URL cambia y que el número de arriba
   («X de Y partidas») cuadra. Dale a la flecha de volver atrás del navegador.
3. **Estadísticas → Meta mundial.** Tarda unos segundos: son varias llamadas a Limitless. Al
   cargar dice de cuántos torneos y cuántas listas sale.
4. **Estadísticas → Comparar.** Lo interesante: el bloque «Dónde os separáis del mundo». Si sale
   vacío es que todavía no hay ningún arquetipo con partidas en los dos sitios — normal al
   principio.
5. **Un mazo con lista → Simulador de manos.** Mira el % de mulligan, **ajusta el número de
   básicos** (la lista no dice cuáles son y el porcentaje depende solo de eso), y tira 10.000
   manos: lo observado tiene que acercarse a la fórmula. Si no se parecen, es que el número de
   básicos no cuadra.

---

## 5. Lo que he dejado fuera, y por qué

- **Las notificaciones push** del documento del 15. Me dijiste que lo que querías era el aviso
  de abajo, no push del navegador. Push de verdad necesita claves VAPID, un service worker y un
  cron —y en Vercel gratis el cron es una vez al día—, así que no está y no lo echo en falta.
- **El heat map del metagame** está como comparación de barras y lista de desvíos, no como
  rejilla de colores. Con los arquetipos que tenéis ahora mismo, una rejilla sería casi toda
  celdas vacías; cuando haya más partidas tiene sentido y es un rato de trabajo.
- **El filtro por región** del meta global. No existe en la API. Lo he dicho en la pantalla en
  vez de poner un selector que no hace nada.
