# Cómo aplicar la v0.50 + v0.51 — lo mínimo posible

Tienes que hacer **cuatro cosas**. El script hace todo lo demás.

## Antes: deja los dos ficheros en Descargas

- `pokearena-v0.51-completa.zip` — la v0.50 y la v0.51 juntas. **No lo descomprimas.**
- `aplicar-v0.51.ps1` — el script.

## Paso 1 · Lanza el script (5 minutos, casi todo esperando)

En VS Code, abre la terminal (**Ctrl + ñ**) en la carpeta del proyecto y pega:

```powershell
powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\aplicar-v0.51.ps1"
```

Hace solo, en este orden: comprueba que todo está en orden; guarda tu rama rota como
`development-roto` (no se pierde nada); vuelve `development` a la v0.49 limpia; aplica la v0.50 y
la v0.51; lanza `npm run verificar` y `npm run build`; pone al día la base de datos de tu
`.env.local`; y hace el commit.

Si algo falla, **se para antes del commit** y te dice qué. Mándame lo que salga en rojo.

## Paso 2 · Míralo (2 minutos)

```powershell
npm run dev
```

Abre `http://localhost:3000` y mira tres cosas:

1. **Estadísticas → Seguimiento de jugadores**: líneas por jugador; toca un punto.
2. **Top Decks → toca un arquetipo**: sus mejores listas; despliega una y salen las cartas.
3. **Barra lateral, abajo**: pone `v0.51.0`.

## Paso 3 · Súbelo

```powershell
powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\aplicar-v0.51.ps1" -SoloSubir
```

Vercel lo despliega solo.

## Paso 4 · Dos cosas que solo puedes hacer tú, en la web (5 minutos)

**A. Cambia la contraseña de la base** (iba en el zip que me mandaste):
Neon → tu proyecto → **Roles** → **Reset password** → copia la nueva `DATABASE_URL` →
pégala en Vercel (**Settings → Environment Variables**) y en tu `.env.local`.

**B. Mira de qué rama despliega Vercel**: **Settings → Git → Production Branch**.

- Si es **`development`**: ya está, el paso 3 lo ha desplegado.
- Si es **`master`**: dímelo y te paso un comando para ponerla al día. (Tu `master` está en la
  v0.24: no lo fusiones dentro de `development`, que es lo que la rompió.)

Y si **producción usa otra base de datos** que la de tu `.env.local`, en Neon abre el SQL Editor
de esa rama y pega `drizzle/0018_v0_45_0.sql` y luego `drizzle/0019_v0_47_0.sql`. Son seguras de
repetir: si ya estaban, no hacen nada.

---

## Para las próximas versiones

A partir de ahora, cada versión será igual: **un zip y un comando**. Y para pasarme el código:

```powershell
git archive --format=zip -o "$env:USERPROFILE\Desktop\arena.zip" HEAD
```

Sin contraseñas, sin `node_modules`. Si hay dudas de ramas, en su lugar:

```powershell
git bundle create "$env:USERPROFILE\Desktop\arena.bundle" --all
```

## Lo que viene

Pendiente, en el orden que te propongo:

1. **Los fallos de iPhone.** Me hace falta de cada uno: pantalla, qué falla y versión de iOS.
2. **Comprobar las listas de Top Decks con datos reales.** El formato no está documentado: si ves
   «lista no disponible» en todas, dímelo y lo ajusto.
3. **Terminar el inglés**: unas 134 frases con números dentro, los números y fechas en formato
   inglés y 7 textos de `ui.tsx`.
4. **Comprobar el cron** (`CRON_SECRET` en Vercel): sin él no se cierran los torneos ni se
   crean los online previstos.
5. **Ciphermaniac**: escribirles para usar sus datos de Regionales.
