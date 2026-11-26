# IMPLEMENTAR v0.140.0

Sobre la **v0.139.0**. **Con migración (0040)** y **variables nuevas**.

## 1. Migración

Neon → SQL Editor, **primero `dev`** y luego `production`: `drizzle/0040_v0_140_0.sql`.

## 2. Aplicar

Descomprime `arena-v0.140.0.zip` en la raíz del repo y doble clic en **`aplicar-v0.140.bat`**.

## 3. Claves para las notificaciones (una vez)

1. En el repo: `npm run vapid`. Saca tres líneas.
2. Vercel → Settings → Environment Variables: añade `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y
   `VAPID_SUBJECT` (pon tu correo en el `mailto:`). **La privada no se comparte ni se sube.**
3. Vuelve a desplegar.

## 4. Probar

1. **Instalar**: en el móvil, Ajustes → «La app en el móvil» → «Instalar PokeArena» (Android) o
   sigue las instrucciones (iPhone). Abre la app instalada.
2. **Notificaciones**: en la app instalada, «Activar notificaciones» → acepta el permiso. Llega
   una de prueba. «Mandar una de prueba» vuelve a mandarla.
3. **Ronda apuntada**: en un torneo de hoy con dos cuentas que dijeron «iré», apunta la ronda 1
   con una: a la otra le llega «Ronda 1: apunta tu resultado».
4. **Confirmación**: apunta una partida de liga con una cuenta; la otra ve en Avisos «X ha
   apuntado vuestra partida» con Confirmar / No es así (y le llega el push).
5. **Jornadas automáticas**: en una competición, activa «Jornadas automáticas». Con todos los
   resultados de la jornada puestos, el cron de la noche empareja la siguiente (puedes lanzar el
   cron a mano desde Vercel → Cron Jobs → Run).
6. **Temporada**: Perfil → Resumen de la temporada → «Imagen para compartir».
7. **PTCG Live**: termina una partida en el juego, «Registro de batalla» → exportar, y pégalo en
   la ficha de tu mazo → «Importar partidas del PTCG Live». **Si no la reconoce, mándame el
   registro** (puedes quitar tu nick) y ajusto el formato.
8. **Recomendador**: junto al acierto dice si «usa el modelo nuevo» o «aún sin confirmar».

## Deshacer

`git revert` del commit. Las tablas nuevas pueden quedarse.
