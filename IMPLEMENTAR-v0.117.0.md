# IMPLEMENTAR v0.117.0

**Acumulativo sobre la v0.113.0**: lleva la v0.114, v0.115, v0.116 y v0.117. Sirve tengas la
0.113, 0.114, 0.115 o 0.116. Cada versión tiene su guía con sus pruebas (`IMPLEMENTAR-v0.114.0.md`
… `IMPLEMENTAR-v0.117.0.md`).

## 1. Migraciones (Neon → SQL Editor, primero `dev`, después `production`)

En este orden, las que no tengas aplicadas (todas son idempotentes):

1. `drizzle/0031_v0_112_0.sql` y `drizzle/0032_v0_113_0.sql` (Cinturón, de antes).
2. `drizzle/0033_v0_116_0.sql` — liga por divisiones.
3. `drizzle/0034_v0_117_0.sql` — posts del foro de Discord.

En local, `npm run db:migrar` las lanza todas contra la base de `.env.local` (debe ser `dev`).
Sin ellas la app funciona: la liga avisa de que falta la migración y los posts no se crean.

## 2. Variables de entorno en Vercel (opcionales)

| Variable | Qué es | Dónde se saca |
|---|---|---|
| `DISCORD_WEBHOOK_FORO` | Webhook de un canal de **tipo foro** (p. ej. `#enfrentamientos`). Es un secreto. | Discord → crear canal → tipo *Foro* → Editar canal → Integraciones → Webhooks → Nuevo → Copiar URL |
| `DISCORD_SERVIDOR_ID` | Id del servidor, para enlazar los posts desde la web. No es secreto. | Discord → Ajustes de usuario → Avanzado → Modo desarrollador; clic derecho en el servidor → Copiar ID |

Sin `DISCORD_WEBHOOK_FORO` no se crean posts. Sin `DISCORD_SERVIDOR_ID` se crean, pero la web no
los enlaza. El aviso de inscripción y el de fin de temporada siguen yendo a `DISCORD_WEBHOOK_LIGA`.

## 3. Aplicar el código (automático)

1. Descomprime `arena-v0.117.0.zip` en la **raíz del repo**.
2. Doble clic en **`aplicar-v0.117.bat`**: comprueba el repo, copia `_v0.117/`, borra lo que sobra,
   lanza `npm run verificar` y `npm run build`, y si todo pasa se borra solo.

## 4. Probar lo de la v0.117 (en dev)

1. **Foro**: con `DISCORD_WEBHOOK_FORO` puesto, empieza una temporada de prueba → en el foro salen
   los posts de la primera jornada («J1 · A vs B · División 1»). Los de las semanas siguientes los
   crea el cron cada día (o llama a `/api/cron/limpieza` con `CRON_SECRET`; la respuesta trae
   `discord.hilos` con cuántos creó).
2. Con `DISCORD_SERVIDOR_ID`, la ficha de una partida de la liga enseña «Quedar en Discord →».
3. **Celebración de división**: la primera visita solo guarda; cuando tu Forma cruce a la
   siguiente división (p. ej. apuntando resultados en dev), al entrar en el Inicio o en tu perfil
   sale la celebración «¡Nueva división de Elo!».

## Deshacer

`git revert`. La tabla `discord_hilos` puede quedarse; los posts ya creados se quedan en Discord.
