# 06 · Despliegue

Cómo ponerlo en internet gratis, y cómo lo lleváis dos personas sin pisaros.

Requisito previo: que funcione en local. Si aún no, ve al
**[manual de instalación](01-instalacion.md)**.

---

## Antes de nada: GitHub Pages no sirve para esto

Es la primera idea que se le ocurre a todo el mundo —el código ya está en GitHub, Pages es
gratis— y no funciona. No es cuestión de configurarlo bien: **GitHub Pages publica ficheros
estáticos**, los sirve tal cual y no ejecuta nada. Arena necesita dos cosas que Pages no tiene:

- **Un servidor Node encendido.** Cada página es un Server Component: se ejecuta en el servidor
  en el momento de la petición, consulta la base de datos y devuelve el HTML ya hecho. Las
  Server Actions son endpoints reales que reciben un `POST`. Nada de eso existe en un hosting
  estático.
- **Una base de datos.** Los datos están en PostgreSQL y las credenciales son secretas. En una
  web estática cualquier clave acaba en el JavaScript que descarga el navegador, es decir, a la
  vista de cualquiera.

Tampoco vale exportar el sitio con `output: "export"`: eso genera un HTML congelado en el
momento de compilar, sin sesiones, sin formularios que guarden nada y con los datos de cuando se
construyó.

**GitHub sigue siendo la pieza donde vive el código.** Lo que no puede es servir la web. De eso
se encarga Vercel, y se conecta al mismo repositorio, así que sigues trabajando con `git push`
igual que si usaras Pages.

---

## Las tres piezas

| Servicio | Para qué | Plan |
|---|---|---|
| **GitHub** | Guardar el código y compartirlo entre los dos | Gratis, repositorios privados con colaboradores ilimitados |
| **Vercel** | Servir la web: ejecuta el servidor Node de Next | Hobby, gratuito, uso personal |
| **Neon** | La base de datos PostgreSQL | Free, 0,5 GB y 100 h de cómputo al mes |

### Por qué Neon y no Supabase

Las dos ofrecen PostgreSQL gratis y las dos habrían valido técnicamente. La diferencia que
decidió es el comportamiento del plan gratuito cuando nadie entra: **Supabase pausa el proyecto
tras unos días de inactividad** y hay que ir al panel a reactivarlo a mano. Una liga que juega
los martes se pasaría media semana dormida, y el primero en abrir la web se encontraría un error
en vez de la clasificación.

Neon también apaga el cómputo cuando no se usa, pero lo **despierta solo** en menos de un segundo
con la primera consulta. Es la diferencia entre "la primera carga tarda un poco" y "hay que ir a
un panel a arreglarlo". Para una web que se abre a ráfagas y luego pasa días quieta, eso pesa más
que cualquier otra comparativa.

Lo demás quedó parejo: el plan gratuito de Neon da 0,5 GB —una liga ocupa kilobytes— y su
cliente `@neondatabase/serverless` habla por HTTP, que es justo lo que quieres desde funciones
que se levantan y se apagan como las de Vercel.

---

## 1. El repositorio en GitHub

Esta es la pieza que hace que lo llevéis dos.

```bash
cd ruta/hasta/arena
git init
git add .
git commit -m "Arena: primera versión"
```

Crea el repositorio. Con [GitHub CLI](https://cli.github.com):

```bash
gh repo create arena --private --source=. --push
```

O desde <https://github.com/new> (privado, sin README ni .gitignore, que ya los tienes) y luego:

```bash
git remote add origin https://github.com/TU-USUARIO/arena.git
git branch -M main
git push -u origin main
```

**Invita a la otra persona:** repositorio → **Settings → Collaborators → Add people**.
Los repositorios privados de GitHub admiten colaboradores ilimitados gratis.

> Comprueba antes del primer push que `.env.local` **no** aparece en `git status`. Está en el
> `.gitignore`, pero merece la pena mirarlo: esa cadena de conexión da acceso completo a la
> base de datos.

---

## 2. Vercel

1. <https://vercel.com> → **Sign up with GitHub**.
2. **Add New → Project** → busca `arena` → **Import**.
3. Vercel detecta Next.js solo. No toques *Build Command* ni *Output Directory*.
4. Despliega **Environment Variables**, y añade estas:

   | Nombre | Valor |
   |---|---|
   | `DATABASE_URL` | La cadena pooled de Neon `production` (alcance **Production** únicamente) |
   | `SESSION_SECRET` | Un secreto propio de producción, distinto al de desarrollo |
   | `APP_URL` | La URL pública, sin barra final: `https://arena-xxxx.vercel.app` |
   | `LIMITLESS_API_KEY` | Opcional. Solo si el endpoint de arquetipos llegara a pedir clave |

   Configura `DATABASE_URL` por separado: URL de la rama `production` para **Production** y URL
   de la rama `dev` para **Preview** y, si se usa, **Development**. No asignes la URL de producción
   a Preview/Development. Mantén también separados los secretos de cada entorno.
5. **Deploy**. En dos o tres minutos tienes `https://arena-xxxx.vercel.app`.

> `APP_URL` es un poco huevo y gallina: no conoces la URL hasta que despliegas. Despliega sin
> ella, copia la dirección que te dé Vercel, añádela y vuelve a desplegar. Solo la usa
> `npm run invite` para componer el enlace que imprime, así que mientras falte la web funciona
> igual; lo único que pasa es que ese comando escribe `localhost`.

> Si usas un `SESSION_SECRET` distinto al de local, no pasa nada: son dos aplicaciones
> independientes y cada una tiene sus sesiones. Solo significa que tendrás que identificarte en
> las dos.

### La primera cuenta en producción

Si has desplegado sobre una base de datos vacía, la pantalla de acceso lo dice: *"Aún no hay
nadie"*. Necesitas una invitación. La creación de la primera cuenta es una operación administrativa
de producción: hazla personalmente con un procedimiento aprobado y acceso temporal y controlado.
No cambies el `.env.local` de desarrollo para que apunte a producción ni entregues esa URL a un agente.
`npm run invite` usa la `DATABASE_URL` local y, por tanto, crea una invitación en `dev`, no en
`production`. No lo uses para aprovisionar la primera cuenta de producción; este repositorio aún
no ofrece un flujo local separado y protegido para esa operación. Resuelve el aprovisionamiento
con un procedimiento administrativo aprobado antes de desplegar una base vacía.

### A partir de aquí

**Cada `git push` a `main` despliega solo.** Los dos publicáis con solo subir código, aunque la
cuenta de Vercel sea de uno. Las ramas y los pull requests generan además una *preview*: una URL
temporal con esos cambios, útil para enseñarse algo antes de darlo por bueno.

---

## 3. Cómo lo lleváis dos personas

| Pieza | Cómo se comparte |
|---|---|
| **Código** | Los dos sois colaboradores del repositorio. Los dos hacéis push, los dos disparan despliegue. |
| **Base de datos** | Neon `dev` se usa en local y previews; Neon `production` solo en Vercel Production. Comparte la URL `dev` por un canal privado solo con quienes la necesiten. |
| **Panel de Vercel** | El plan Hobby es de una persona: no admite miembros de equipo. La cuenta la abre uno. |

**Esto último no os limita en la práctica.** Todo lo que se hace a diario —cambiar código,
desplegar, ver si el despliegue fue bien desde el commit en GitHub— pasa por el repositorio. Al
panel de Vercel solo se entra para cambiar variables de entorno o mirar logs, y eso es cosa de
semanas, no de días.

Si aun así queréis los dos acceso al panel: abrid la cuenta de Vercel con un correo compartido y
guardad la contraseña en un gestor. Es lo que hace todo el mundo en proyectos de dos.

### Flujo de trabajo sugerido

Para cambios pequeños, directo a `main`:

```bash
git pull
# … cambios …
npm run dev          # comprueba que funciona
npm test
npm run build
git add .
git commit -m "Añade el campo de premios restantes"
git push
```

Para algo más gordo, una rama:

```bash
git checkout -b top-cut
# … cambios …
git push -u origin top-cut
```

Vercel te da una URL de preview. Cuando esté bien, pull request y merge a `main`.

Las previews deben usar la rama Neon `dev`; el despliegue de Production debe usar `production`.
No automatices `db:push`, `db:seed` ni migraciones contra producción. Para cambios de esquema,
revisa el SQL y deja que una persona responsable apruebe y ejecute el procedimiento de producción.

**Regla de oro entre dos personas:** `git pull` **antes** de empezar a tocar nada. La mayoría de
conflictos vienen de empezar sobre una versión vieja.

---

## 4. Dominio propio (opcional)

Vercel → proyecto → **Settings → Domains → Add**. Añadir el dominio es gratis; el dominio en sí
lo pagas donde lo compres (unos 10 €/año en Namecheap, Porkbun, Cloudflare…). Vercel te dice
qué registros DNS poner y gestiona el certificado HTTPS solo.

No hace ninguna falta: `arena-xxxx.vercel.app` funciona igual de bien.

---

## 5. Variables de entorno, en detalle

| Variable | Obligatoria | Qué pasa si falta |
|---|---|---|
| `DATABASE_URL` | Sí | Error en cuanto se toca la base de datos |
| `SESSION_SECRET` | Sí | Error al leer o escribir la sesión: nadie puede entrar |
| `APP_URL` | No | Solo afecta a `npm run invite`: el enlace sale con `localhost` |
| `LIMITLESS_API_KEY` | No | Solo la usa `npm run archetypes:sync` si Limitless la pide |

**Para cambiar una en producción:** Vercel → *Settings → Environment Variables* → editar →
y luego **redesplegar** (*Deployments* → el último → `…` → *Redeploy*). Las variables se leen al
construir y al arrancar, no en caliente.

---

## 6. Comprobar que el despliegue está bien

1. Abre la URL de Vercel. Debe salir la pantalla de **Entrar** con el formulario de correo y
   contraseña.
2. Entra con tu cuenta.
3. Registra una partida de prueba y bórrala.
4. *Ajustes → Invitaciones* → crea un enlace y ábrelo en una ventana privada: debe enseñar el
   formulario de alta.
5. Abre la misma URL en el móvil: debe pedirte identificarte otra vez (las cookies son por
   dispositivo) y luego enseñar **los mismos datos**. Si los ves, la base de datos compartida
   funciona. Aprovecha para añadirla a la pantalla de inicio: la aplicación trae manifest, así
   que se instala como una app y arranca sin la barra del navegador.

---

## 7. Rendimiento y límites

Con una liga privada no vas a acercarte a ningún límite, pero por si acaso:

| Límite | Plan gratuito | Consumo real de una liga |
|---|---|---|
| Vercel — ancho de banda | 100 GB/mes | Unos pocos MB |
| Vercel — ejecución de funciones | Amplio | Cada carga de página es una función corta |
| Neon — almacenamiento | 0,5 GB | Unos KB por temporada |
| Neon — cómputo | 100 h/mes | Se despierta bajo demanda; una fracción mínima |

**La primera visita después de un rato puede tardar un par de segundos**: Neon apaga el cómputo
cuando nadie lo usa y tiene que despertarlo. Es normal y no es un problema.

> A diferencia del plan gratuito de Supabase, Neon **no pausa ni borra** proyectos por
> inactividad. Fue la razón principal para elegirlo, como se explica
> [arriba](#por-qué-neon-y-no-supabase).

---

## 8. Copias de seguridad

Neon guarda un historial de cambios recientes que permite restaurar la base de datos a un punto
anterior (*Branches → Restore*), pero el plan gratuito tiene ventana corta. Para dormir
tranquilo, exporta de vez en cuando. Está explicado en
**[09 · Mantenimiento](09-mantenimiento.md#copias-de-seguridad)**.
