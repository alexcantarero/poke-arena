# IMPLEMENTAR v0.135.0

Sobre la **v0.134.0**. **Con migración (0037).**

## 1. Migración

Neon → SQL Editor, **primero `dev`** y luego `production`: `drizzle/0037_v0_135_0.sql`
(idempotente). En local: `npm run db:migrar`. Sin ella, todo funciona menos abrir el registro.

## 2. Aplicar

Descomprime `arena-v0.135.0.zip` en la raíz del repo y doble clic en **`aplicar-v0.135.bat`**.
Si algo falla, mándame `aplicar-v0.135.log`.

## 3. Para que te encuentren en Google

1. En Vercel → Settings → Environment Variables, pon **`APP_URL`** con la dirección buena
   (p. ej. `https://poke-arena-sand.vercel.app` o la que elijas abajo) y vuelve a desplegar.
2. Si quieres otra dirección: Vercel → Settings → General → **Project Name** cambia el
   subdominio `*.vercel.app` (si está libre), o compra un dominio y añádelo en Settings → Domains.
3. Da de alta la web en **Google Search Console** (gratis) y envía `/sitemap.xml`. Sin esto
   Google puede tardar semanas en encontrarla.

## 4. Probar

1. **Registro abierto** (dueño): Ajustes → Invitaciones → «Abrir el registro». En incógnito,
   `/registro` deja crear cuenta sin código. Al crearla, aterriza en su perfil con «Completa tu
   perfil» y la campana tiene los tres avisos de perfil los primeros. Ciérralo después si no lo
   quieres abierto todavía.
2. **«Es mi resultado»**: Torneos → Apuntar un resultado de Cup o Challenge, marca la casilla.
   En tu perfil sale el torneo con sus CP. Repite con la misma tienda y fecha: no se crea otro.
3. **Duplicados**: Torneos → «Torneos duplicados →». Fusiona un par y comprueba que el que queda
   tiene los resultados y rondas de los dos. Crea a mano un torneo que ya exista ese día: te abre
   el que había.
4. **Elegir mazo** (en el móvil): en el modo torneo, en una ronda de la ficha y en un resultado,
   escribe tres letras: la lista se filtra; un toque elige; «Cambiar» vuelve a abrir.
5. **Modo torneo**: el nombre del rival a la vista; al marcar Derrota en un Bo1, los premios
   junto a las etiquetas.

## Deshacer

`git revert` del commit. La tabla `ajustes_extra` puede quedarse.
