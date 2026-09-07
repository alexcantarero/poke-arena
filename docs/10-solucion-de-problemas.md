# 10 · Solución de problemas

Los errores concretos que te puedes encontrar, con su causa y su arreglo. Busca el mensaje que
te sale.

---

## Al instalar

### `node: command not found` / `'node' no se reconoce`

Node no está instalado, o la terminal es anterior a la instalación.

**Windows:** cierra la terminal y abre una nueva. Windows no actualiza el PATH en las terminales
ya abiertas, y es la causa número uno de este error. Si sigue, reinstala con
`winget install OpenJS.NodeJS.LTS`.

### `npm error code EACCES` (macOS / Linux)

Permisos. **No lo arregles con `sudo npm install`**: eso deja ficheros de root en el proyecto y
da problemas después. Instala Node con Homebrew (`brew install node`) o con
[nvm](https://github.com/nvm-sh/nvm), que lo dejan en tu carpeta de usuario.

### `npm install` falla con errores de red

Comprueba la conexión y, si estás en una red corporativa con proxy:

```bash
npm config set proxy http://tu-proxy:puerto
npm config set https-proxy http://tu-proxy:puerto
```

### `npm install` termina con `ERR!` sobre `node_modules`

Empieza de cero:

```bash
rm -rf node_modules package-lock.json    # Windows: Remove-Item -Recurse -Force
npm install
```

---

## Al configurar

### `Falta DATABASE_URL. Copia .env.example a .env.local…`

El fichero `.env.local` no existe, está mal nombrado, o la variable está vacía.

- Comprueba que el fichero se llama exactamente `.env.local`, con el punto delante. En Windows el
  Explorador oculta las extensiones y es fácil acabar con `.env.local.txt`.
- Comprueba que la línea es `DATABASE_URL="postgresql://…"`, con comillas y sin espacios
  alrededor del `=`.
- Si acabas de crear el fichero, **reinicia `npm run dev`**: las variables se leen al arrancar.
- En Vercel: *Settings → Environment Variables*, y redespliega después de añadirla.

### `Falta SESSION_SECRET en las variables de entorno`

Lo mismo, con la otra variable. Genera uno:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### `npm run db:push` dice que falta `DATABASE_URL` aunque está en `.env.local`

`drizzle.config.ts` carga `.env.local` explícitamente, así que esto no debería pasar. Si pasa:

- Comprueba que ejecutas el comando **desde la raíz del proyecto**, no desde `src/`.
- Comprueba que el fichero no tiene un BOM ni caracteres raros al principio (algunos editores de
  Windows lo añaden). Vuelve a crearlo con `cp .env.example .env.local`.

---

## Al arrancar

### `Error: connect ETIMEDOUT` o `getaddrinfo ENOTFOUND`

No se llega a Neon.

- Comprueba la conexión a internet.
- Comprueba que la `DATABASE_URL` está completa, incluido el `?sslmode=require` del final.
- Comprueba en el panel de Neon que el proyecto sigue existiendo.
- En una red corporativa, puede haber un cortafuegos bloqueando el puerto 5432. Prueba desde
  otra red para descartarlo.

### `relation "players" does not exist`

Las tablas no están creadas.

```bash
npm run db:push
```

### `password authentication failed`

La `DATABASE_URL` es incorrecta o la contraseña ha rotado. Cópiala otra vez del panel de Neon
(*Connection Details*), eligiendo la variante **Pooled connection**.

### El puerto 3000 está ocupado

```bash
npm run dev -- -p 3001
```

O cierra lo que esté usando el 3000.

### La primera carga tarda varios segundos

Normal, dos motivos que se suman:

- En desarrollo, Next compila cada página la primera vez que la abres.
- Neon apaga el cómputo cuando nadie lo usa y tarda un momento en despertar.

A partir de la segunda visita va rápido. En producción solo aplica lo segundo.

---

## Al usar la web

### No puedo entrar: el código no me lo acepta

El código de **Ajustes** manda sobre el de `.env`. Si alguien lo cambió ahí, el del fichero ya no
vale.

Si te has quedado fuera, míralo o bórralo desde el SQL Editor de Neon:

```sql
SELECT invite_code FROM settings WHERE id = 'default';
UPDATE settings SET invite_code = '' WHERE id = 'default';   -- deja entrada libre
```

### La pantalla de entrar dice "Todavía no hay jugadores"

La base de datos está vacía. O siembras datos de ejemplo:

```bash
npm run db:seed
```

O creas el primer jugador a mano con `npm run db:studio` (tabla `players`: un `id` cualquiera
como `p1`, tu nombre, `color` `#f0b429`, `is_admin` a `true`, `active` a `true`, `joined` con una
fecha).

### He guardado un cambio y no se ve

- Recarga la página.
- En producción, comprueba en Vercel que el despliegue terminó (*Deployments*, en verde).
- Si es un cambio de código, comprueba que hiciste `git push`.

### Los sprites de los Pokémon salen rotos

El identificador no coincide con el de Limitless. Búscalo en <https://limitlesstcg.com/decks>,
mira la URL de la imagen y corrígelo en el mazo.

Recuerda las conversiones: `Mega Excadrill ex` → `excadrill-mega`, `N's Zoroark ex` → `zoroark`.

**No afecta a ninguna estadística.** Es solo la imagen.

### La lista de mazo dice que no suma 60 cartas

Es un aviso, no un error: puedes guardar igualmente. Causas habituales:

- La exportación se cortó al copiar. Vuelve a copiarla entera.
- La cabecera de sección dice un número que no coincide con las cartas listadas debajo. El aviso
  cuenta **las cartas**, que es lo correcto; la cabecera puede estar mal.
- Alguna línea no se entendió: sale en rojo debajo, con el texto exacto.

### La matriz de emparejamientos está vacía

Solo entran partidas donde **los dos** jugadores tienen mazo asignado. Registra unas cuantas
partidas asignando mazo a ambos lados.

### He borrado un jugador y sigue apareciendo

Es a propósito. Un jugador con partidas no se borra: se **desactiva**, para no dejar el historial
huérfano. Desaparece del ranking y de los desplegables, pero sus partidas siguen contando.

Si de verdad quieres eliminarlo, primero hay que borrar o reasignar todas sus partidas.

---

## Al desplegar

### El build de Vercel falla con `Falta DATABASE_URL`

No has añadido las variables de entorno en Vercel, o no están marcadas para el entorno
*Production*. *Settings → Environment Variables*, revísalas y **redespliega**.

### El build falla con errores de TypeScript

`npm run build` en local reproduce exactamente lo que hace Vercel. Arréglalo ahí, donde el ciclo
es de segundos, y luego sube.

### La web carga pero da error 500 al entrar

Casi siempre `SESSION_SECRET` sin definir en Vercel. Mira los logs en *Deployments → el
despliegue → Functions*.

### Los cambios no se despliegan

- ¿Hiciste `git push`?
- ¿A la rama `main`? Vercel solo despliega a producción desde la rama de producción; las demás
  generan previews.
- Mira *Deployments* en Vercel: si el último está en rojo, ahí verás el error.

---

## Base de datos

### Neon dice que se han agotado las horas de cómputo

El plan gratuito da 100 h/mes por proyecto. Una liga privada no llega ni de lejos, así que si
pasa hay algo consumiendo de más: casi seguro un script en bucle o una pestaña con
`npm run db:studio` abierta días. Ciérralo y espera al mes siguiente, o mira el gráfico de uso en
el panel de Neon.

### He borrado algo sin querer

- Si tienes copia, restáurala ([09 · Mantenimiento](09-mantenimiento.md#copias-de-seguridad)).
- Si no, Neon guarda un historial reciente: *Branches → Restore*, y elige un punto anterior. En
  el plan gratuito la ventana es corta, así que hazlo pronto.

### Quiero mirar los datos en crudo

```bash
npm run db:studio
```

O el SQL Editor del panel de Neon, para consultas propias.

---

## Cuando nada de esto sirve

Datos que ayudan a diagnosticar:

```bash
node -v
npm -v
npm ls next drizzle-orm
```

Y el error **completo** de la terminal, no solo la última línea: la causa real suele estar tres o
cuatro renglones más arriba.

Sitios donde mirar:

- **Logs de Vercel**: *Deployments → el despliegue → Functions*.
- **Neon**: panel del proyecto, *Monitoring*.
- **En local**: la terminal donde corre `npm run dev`, y la consola del navegador (F12).
