# 01 · Instalación en otro PC

Guía paso a paso para dejar Arena funcionando en un ordenador desde cero. No da nada por
sabido. Después de cada paso hay una **comprobación**: si no da lo que pone, no sigas — el
problema está ahí y no en el paso siguiente.

Tiempo estimado: **20-30 minutos**, casi todo esperando descargas.

**Índice**

1. [Qué vas a instalar](#1-qué-vas-a-instalar)
2. [Instalar Node.js](#2-instalar-nodejs)
3. [Instalar Git](#3-instalar-git)
4. [Traer el código](#4-traer-el-código)
5. [Instalar las dependencias](#5-instalar-las-dependencias)
6. [Crear la base de datos en Neon](#6-crear-la-base-de-datos-en-neon)
7. [Configurar las variables de entorno](#7-configurar-las-variables-de-entorno)
8. [Crear las tablas](#8-crear-las-tablas)
9. [Meter datos](#9-meter-datos)
10. [Arrancar](#10-arrancar)
11. [Entrar por primera vez](#11-entrar-por-primera-vez)
12. [El día a día](#12-el-día-a-día-cuando-ya-está-instalado)
13. [Instalar en un segundo ordenador](#13-instalar-en-un-segundo-ordenador)

---

## 1. Qué vas a instalar

Cuatro cosas, ninguna de pago:

| | Qué es | Dónde vive |
|---|---|---|
| **Node.js** | El motor que ejecuta el código. Trae `npm` incluido. | Tu ordenador |
| **Git** | Para traerte el código y subir cambios. | Tu ordenador |
| **El proyecto** | La carpeta `poke-arena` con todo el código. | Tu ordenador |
| **Neon** | La base de datos donde viven jugadores, mazos y partidas. | En la nube, gratis |

La base de datos **no se instala**: es un servicio en la nube. Si dos ordenadores apuntan a la
misma rama `dev`, comparten esos datos de desarrollo. La aplicación publicada usa la rama
`production`, que debe mantenerse separada.

---

## 2. Instalar Node.js

Necesitas la versión **20 o superior**. Descárgala de <https://nodejs.org> — el botón **LTS**,
que es la versión estable.

### Windows

Con el instalador de la web, o desde PowerShell:

```powershell
winget install OpenJS.NodeJS.LTS
```

> **Cierra la terminal y abre una nueva** después de instalar. Windows no actualiza el PATH en
> las terminales que ya estaban abiertas, y es la causa número uno de "pero si lo acabo de
> instalar".

### macOS

```bash
brew install node
```

O el instalador `.pkg` de nodejs.org si no usas Homebrew.

### Linux (Ubuntu/Debian)

El Node de los repositorios suele ir muy atrasado. Usa el repositorio oficial:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### Comprobación

```bash
node -v
npm -v
```

Tiene que salir algo como `v20.11.0` (o superior) y `10.x`. Si sale
`command not found` / `no se reconoce`, cierra la terminal y abre otra; si sigue, la
instalación no terminó bien.

---

## 3. Instalar Git

### Windows

```powershell
winget install Git.Git
```

### macOS

Viene con las herramientas de línea de comandos de Xcode:

```bash
xcode-select --install
```

### Linux

```bash
sudo apt install git
```

### Comprobación

```bash
git --version
```

Debe responder algo como `git version 2.51.0`.

---

## 4. Traer el código

**Si ya está en GitHub** (lo normal a partir de la primera vez):

```bash
cd ~/Documentos          # o donde quieras guardarlo
git clone https://github.com/TU-USUARIO/arena.git
cd arena
```

Si el repositorio es privado, Git te pedirá usuario y contraseña. La contraseña **no** es la de
GitHub: es un *personal access token*. Se crea en
<https://github.com/settings/tokens> → *Generate new token (classic)* → marca el permiso
`repo` → copia el token y pégalo cuando Git pida la contraseña. Más cómodo todavía es instalar
[GitHub CLI](https://cli.github.com) y hacer `gh auth login` una vez.

**Si tienes el zip** (la primera vez):

Descomprímelo donde quieras y entra en la carpeta:

```bash
cd ruta/hasta/poke-arena
```

### Comprobación

```bash
ls          # en Windows PowerShell también vale
```

Tienes que ver `package.json`, `src`, `docs`, `README.md`. Si no los ves, estás en la carpeta
de al lado: comprueba si has entrado en `poke-arena/poke-arena`.

---

## 5. Instalar las dependencias

```bash
npm install
```

Tarda uno o dos minutos y crea una carpeta `node_modules` de unos 300 MB. Esa carpeta **no se
sube nunca a Git** (ya está en el `.gitignore`): se regenera con este mismo comando.

Verás avisos amarillos de `deprecated`. Son normales y no rompen nada. Lo que sí importa es que
no termine con `ERR!`.

### Comprobación

```bash
npm ls next
```

Debe listar `next@15.x.x`.

---

## 6. Crear las ramas de desarrollo y producción en Neon

Solo hace falta **la primera vez**. Si estás instalando en un segundo ordenador, salta al
paso 7 y usa la cadena de conexión de la rama `dev`.

1. Entra en <https://neon.com> y crea una cuenta gratuita (con GitHub es más rápido).
2. **Create project**:
   - Nombre: `arena`
   - Postgres version: la que venga por defecto
   - Región: **Europe (Frankfurt)** o la que te pille más cerca
3. Conserva la rama que utilizará la aplicación publicada como producción. Si ya existe una
   base de producción, no la reemplaces ni la uses para desarrollo.
4. Crea una rama Neon llamada `dev` para el trabajo local y las previews. En adelante, copia
   para tu ordenador solo la URL de esta rama.
5. En **Connection Details**, elige la **Pooled connection** de la rama `dev`: lleva `-pooler`
   en el host y termina en `?sslmode=require`.

> Una rama Neon nueva hereda una instantánea de su rama padre. Si `dev` se crea desde
> producción, puede contener datos reales: límpialos o anonimízalos antes de compartir esa rama
> o habilitar previews.

Tiene esta pinta:

```
postgresql://neondb_owner:npg_XXXXXXXX@ep-cool-name-12345678-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

Cópiala entera. Si la pierdes: panel de Neon → tu proyecto → **Connection Details**.

> **El plan gratuito da 0,5 GB de almacenamiento y 100 horas de cómputo al mes.** Una liga de
> amigos ocupa unos pocos kilobytes por temporada y consume una fracción mínima de esas horas:
> no vas a acercarte al límite. A diferencia del plan gratuito de Supabase, Neon **no pausa ni
> borra** los proyectos por inactividad; solo apaga el cómputo, que vuelve a arrancar en menos
> de un segundo cuando alguien entra.

---

## 7. Configurar las variables de entorno

Las claves que necesita la aplicación van en un fichero llamado `.env.local`, que **no se
sube a Git** por seguridad. En este ordenador, `DATABASE_URL` debe apuntar exclusivamente a
Neon `dev`; la URL de producción se configura solo en el entorno Production de Vercel.

```bash
cp .env.example .env.local
```

En Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Ábrelo con cualquier editor de texto y rellena:

```bash
DATABASE_URL="postgresql://…URL pooled de la rama dev…"
SESSION_SECRET="una cadena larga y aleatoria"
APP_URL="http://localhost:3000"
```

- **`DATABASE_URL`** — la cadena pooled de Neon `dev`, entre comillas. No pongas aquí la URL
  de producción.
- **`SESSION_SECRET`** — el secreto con el que se firman las cookies de sesión. Genera uno:

  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

  Copia lo que salga. Si lo cambias más adelante, todo el mundo tendrá que volver a entrar:
  no es grave, pero conviene saberlo.
- **`APP_URL`** — la dirección pública de la aplicación. **Solo la usa `npm run invite`**, para
  componer el enlace de invitación que imprime por pantalla. En local, `http://localhost:3000`;
  cuando despliegues, la URL de Vercel.
- **`LIMITLESS_API_KEY`** — opcional, y hoy no hace falta. Está por si el endpoint de arquetipos
  de Limitless llega a pedir clave; solo la lee `npm run archetypes:sync`.

> **Ya no hay código de liga compartido.** Antes existía un `LEAGUE_INVITE_CODE` con el que
> cualquiera entraba eligiendo un jugador de la lista. Ahora cada persona tiene su cuenta con
> correo y contraseña, y se entra por un enlace de invitación de un solo uso. Si te encuentras
> esa variable en un `.env.local` viejo, bórrala: no la lee nadie.

### Comprobación

El fichero se llama exactamente `.env.local`, con el punto delante. En Windows, el Explorador
oculta las extensiones y es fácil acabar con un `.env.local.txt` que no sirve. Comprueba con:

```bash
ls -la .env.local      # macOS / Linux
dir .env.local         # Windows
```

---

## 8. Crear las tablas

```bash
npm run db:push
```

Esto lee `src/db/schema.ts` y crea en Neon `dev` las tablas que necesita la aplicación. Te
mostrará las sentencias SQL y pedirá confirmación. Comprueba el destino antes de aceptar; nunca
ejecutes este comando contra producción.

### Comprobación

```bash
npm run db:studio
```

Abre un explorador visual de la base de datos en el navegador. Deberías ver las tablas
`settings`, `players`, `invites`, `archetypes`, `decks`, `competitions`, `competition_players`,
`matches`, `games`, `tournaments`, `tournament_results` y `events`, todas vacías. Ciérralo con
`Ctrl+C` en la terminal.

---

## 9. Meter datos

Dos opciones. Elige una.

**A) Con datos de ejemplo**, para ver la web llena y entender cómo funciona:

```bash
npm run db:seed
```

Crea 6 jugadores con cuenta, 20 arquetipos del metagame Standard, 10 mazos, 3 competiciones, 41
partidas, 3 eventos de calendario y 2 torneos de fuera con sus resultados. Todo inventado, y
todo borrable después desde la propia web.

Las seis cuentas de ejemplo comparten la contraseña `arena1234` y su correo se imprime al
terminar (`ibai@ejemplo.test`, `marta@ejemplo.test`…). La primera, Ibai, es la organizadora.

**B) En limpio**, para empezar vuestra liga de verdad desde el minuto uno:

```bash
npm run db:seed -- --empty
```

Crea solo la configuración de la liga y el catálogo de arquetipos del metagame, sin ningún
jugador.

> **Los dos modos borran lo que hubiera antes.** `db:seed` limpia todas las tablas y vuelve a
> escribirlas: úsalo para probar, nunca sobre una liga en marcha.

En los dos casos el comando deja además **una invitación creada y sin límite de usos**, e imprime
su enlace. Ábrelo y date de alta: como no hay nadie más, te quedas como organizador. Si prefieres
generar la invitación tú, es el paso 11.

### Comprobación

El comando termina diciendo cuántos jugadores, mazos y partidas ha creado, y con qué enlace
puedes darte de alta.

---

## 10. Arrancar

```bash
npm run dev
```

Verás algo como:

```
▲ Next.js 15.5.0
- Local:   http://localhost:3000
✓ Ready in 2.1s
```

Abre <http://localhost:3000> en el navegador.

> La primera vez que abres cada pantalla tarda un segundo o dos: en modo desarrollo Next
> compila cada página bajo demanda. A partir de la segunda visita va instantáneo. En producción
> (Vercel) esto no pasa.

Para parar el servidor: `Ctrl+C` en la terminal.

---

## 11. Entrar por primera vez

Cada jugador tiene **cuenta propia con correo y contraseña**, y solo se puede crear desde un
**enlace de invitación**. Eso deja un problema de huevo y gallina la primera vez: no hay ninguna
cuenta, así que no hay nadie que pueda invitarte. Se resuelve desde la terminal.

```bash
npm run invite
```

Imprime algo así:

```
Invitación creada.

  http://localhost:3000/registro/8Kj2mQ7xR4vN...

  1 uso, caduca en 14 días.
```

Abre ese enlace en el navegador, rellena nombre, correo y contraseña, y ya estás dentro. **El
primero que se da de alta se queda como `owner`** (organizador de la liga): es quien puede
repartir papeles y crear más invitaciones desde la propia web.

El comando admite tres argumentos opcionales — etiqueta, usos y días — por si quieres una
invitación distinta de la de serie:

```bash
npm run invite -- "Javi" 5 90     # para Javi, 5 usos, caduca en 90 días
npm run invite -- "Grupo" 0 0     # usos ilimitados, sin caducidad
```

El enlace se compone con `APP_URL`. Si lo despliegas en otro dominio y el enlace sale con
`localhost`, es que falta esa variable.

> **A partir de la segunda persona no hace falta la terminal.** Desde *Ajustes → Invitaciones*
> cualquier organizador crea enlaces, los copia o los comparte con el botón nativo del móvil, y
> los anula si hace falta.

La sesión se guarda en una cookie firmada que dura 180 días, así que no tendrás que repetirlo.
Para salir, el botón de la barra lateral en escritorio, o *Más → Salir de la cuenta* en móvil.

A partir de aquí, sigue con el **[manual de usuario](02-manual-de-usuario.md)**.

---

## 12. El día a día, cuando ya está instalado

Cada vez que quieras trabajar en el proyecto:

```bash
cd ruta/hasta/arena
git pull          # trae los cambios de la otra persona
npm install       # solo si el pull tocó package.json
npm run dev
```

Y cuando termines de hacer cambios:

```bash
git add .
git commit -m "Descripción de lo que has cambiado"
git push
```

Si el proyecto está desplegado en Vercel, ese `git push` publica los cambios en internet
automáticamente. Ver **[06 · Despliegue](06-despliegue.md)**.

---

## 13. Instalar en un segundo ordenador

Es más corto, porque la base de datos ya existe:

1. Instala **Node.js** y **Git** (pasos 2 y 3).
2. `git clone` del repositorio (paso 4).
3. `npm install` (paso 5).
4. `cp .env.example .env.local` y configura la URL de la rama Neon `dev`, no la de producción.
   Podéis compartir la URL `dev` por un canal privado si queréis trabajar con los mismos datos
   de desarrollo. Usad un `SESSION_SECRET` local.
5. **No ejecutes `db:push` ni `db:seed`**: las tablas ya están creadas y los datos ya existen.
   `db:seed` **borra todo** antes de sembrar.
6. `npm run dev`, y entra con tu correo y tu contraseña de siempre. No hace falta invitación
   nueva: la cuenta está en la base de datos, no en el ordenador.

No compartas secretos de producción. La `DATABASE_URL` da acceso a la base de datos; comparte
la URL `dev` solo por un canal privado y únicamente con quienes necesiten ese acceso.

---

## Si algo ha fallado

Ve a **[10 · Solución de problemas](10-solucion-de-problemas.md)**: están los errores concretos
con su causa y su arreglo.
