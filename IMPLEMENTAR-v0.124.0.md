# IMPLEMENTAR v0.124.0

Sobre la **v0.123.0**.

## 1. Migración (para la dirección de los torneos)

Neon → SQL Editor, **primero `dev`** y luego `production`: `drizzle/0036_v0_124_0.sql`
(idempotente). En local: `npm run db:migrar`. Sin ella la app funciona igual; la dirección no se
guarda ni se ve. Se puede aplicar antes o después de desplegar.

## 2. Aplicar (automático, con commit y push)

1. Cierra `npm run dev`.
2. Descomprime `arena-v0.124.0.zip` en la **raíz del repo**.
3. Doble clic en **`aplicar-v0.124.bat`**: comprueba, copia (y borra `_v0.124/` en seguida), borra
   lo que sobra (`src/components/EventForm.tsx` y los restos de la v0.123), verifica, hace el
   build y, si todo pasa, **commit y push** a tu rama. Si algo falla, mándame `aplicar-v0.124.log`.

## 3. El icono de Discord (a mano, una vez)

El logotipo es de Discord y no va dibujado en el código: baja el **símbolo** oficial en SVG de
<https://discord.com/branding> y guárdalo como **`public/logos/discord.svg`** (el blanco o el
blurple: la barra es oscura en los dos temas). Haz commit de ese fichero. Mientras no esté, el
pie de la barra sigue enseñando el globo y la palabra «Discord»: no se rompe nada.

## 4. Variables de entorno

Ninguna nueva. El aviso de reset usa `DISCORD_WEBHOOK_LIGA`; si no está, `DISCORD_WEBHOOK_AGENDA`
y, si tampoco, `DISCORD_WEBHOOK_RESULTADOS`.

## 5. Probar

1. **Ranking / perfil**: el Elo ha cambiado (se recalcula). Abre una ronda de Cup de alguien con
   Elo alto en la gráfica: una victoria y una derrota mueven cifras parecidas.
2. **Torneos → Nuevo → Pegar del localizador**: pega

   ```
   Copa de Liga
   LORCANOS - TCG League Cup Season 1
   CARRER D'IGNASI IGLESIAS, 10, 08912 BADALONA, BARCELONA, SPAIN
   sábado, 28 de noviembre de 2026 03:00 p.m.
   ```

   y pulsa «Rellenar el formulario»: tipo League Cup, nombre entero, tienda «Lorcanos», ciudad
   «Barcelona (Badalona)», dirección completa, 28/11/2026 15:00, precio 0. Crea el torneo: la
   ficha enseña «Gratis», la dirección y «Cómo llegar» (con la migración aplicada).
3. **Calendario** (organizador): ya no está «Añadir al calendario»; pegar el mismo bloque en
   «Challenges y Cups de la zona» crea el torneo con los mismos campos.
4. **Top Decks → Último torneo**: los títulos dicen «más de 300» y «de 150 a 300».
5. **Reset del ladder** (¡en `dev`, que borra los rangos de todos!): Ajustes → nueva temporada.
   Sale el mensaje en Discord y, a cada jugador sin rango, el aviso rojo arriba; al poner el
   rango desaparece.

## Deshacer

`git revert` del commit. La tabla `tournament_direcciones` puede quedarse.
