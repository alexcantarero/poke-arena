# 06 · Despliegue

Cómo ponerlo en internet gratis, y cómo lo lleváis dos personas sin pisaros.

Requisito previo: que funcione en local. Si aún no, ve al
**[manual de instalación](01-instalacion.md)**.

---

## Las tres piezas

| Servicio | Para qué | Plan |
|---|---|---|
| **GitHub** | Guardar el código y compartirlo entre los dos | Gratis, repositorios privados con colaboradores ilimitados |
| **Vercel** | Servir la web | Hobby, gratuito, uso personal |
| **Neon** | La base de datos | Free, 0,5 GB y 100 h de cómputo al mes |

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
4. Despliega **Environment Variables**, y añade las tres:

   | Nombre | Valor |
   |---|---|
   | `DATABASE_URL` | La cadena de Neon (la **pooled**) |
   | `SESSION_SECRET` | El mismo secreto que en local, o uno nuevo |
   | `LEAGUE_INVITE_CODE` | El código de la liga |

   Márcalas para los tres entornos: *Production*, *Preview* y *Development*.
5. **Deploy**. En dos o tres minutos tienes `https://arena-xxxx.vercel.app`.

> Si usas un `SESSION_SECRET` distinto al de local, no pasa nada: son dos aplicaciones
> independientes y cada una tiene sus sesiones. Solo significa que tendrás que identificarte en
> las dos.

### A partir de aquí

**Cada `git push` a `main` despliega solo.** Los dos publicáis con solo subir código, aunque la
cuenta de Vercel sea de uno. Las ramas y los pull requests generan además una *preview*: una URL
temporal con esos cambios, útil para enseñarse algo antes de darlo por bueno.

---

## 3. Cómo lo lleváis dos personas

| Pieza | Cómo se comparte |
|---|---|
| **Código** | Los dos sois colaboradores del repositorio. Los dos hacéis push, los dos disparan despliegue. |
| **Base de datos** | Una sola, en Neon, compartida. Neon permite invitar miembros a la organización, pero para el día a día basta con que los dos tengáis la `DATABASE_URL`. |
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
| `SESSION_SECRET` | Sí | Error al entrar o al leer la sesión |
| `LEAGUE_INVITE_CODE` | No | Se entra sin código, solo eligiendo jugador |
| `LIMITLESS_API_KEY` | No | Solo la usa `npm run archetypes:sync` si Limitless la pide |

**Para cambiar una en producción:** Vercel → *Settings → Environment Variables* → editar →
y luego **redesplegar** (*Deployments* → el último → `…` → *Redeploy*). Las variables se leen al
construir y al arrancar, no en caliente.

---

## 6. Comprobar que el despliegue está bien

1. Abre la URL de Vercel. Debe salir la pantalla de **Entrar**.
2. Entra con el código y elige jugador.
3. Registra una partida de prueba y bórrala.
4. Abre la misma URL en el móvil: debe pedirte identificarte otra vez (las cookies son por
   dispositivo) y luego enseñar **los mismos datos**. Si los ves, la base de datos compartida
   funciona.

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
> inactividad. Fue la razón principal para elegirlo: una liga que juega los martes se pasaría la
> semana pausada.

---

## 8. Copias de seguridad

Neon guarda un historial de cambios recientes que permite restaurar la base de datos a un punto
anterior (*Branches → Restore*), pero el plan gratuito tiene ventana corta. Para dormir
tranquilo, exporta de vez en cuando. Está explicado en
**[09 · Mantenimiento](09-mantenimiento.md#copias-de-seguridad)**.
