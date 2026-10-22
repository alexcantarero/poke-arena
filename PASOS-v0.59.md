# Cómo aplicar la v0.59 — un zip, un comando y los webhooks de Discord

**Lleva una migración** (comentarios de los mazos); el script la lanza sola contra la base de tu
`.env.local`. Si producción usa otra base, pega `drizzle/0022_v0_59_0.sql` en el SQL Editor de
Neon de esa rama: es segura de repetir.

## 1. Aplicar

1. Pon en Descargas `pokearena-v0.59-completa.zip` (sin descomprimir) y `aplicar-v0.59.ps1`.
2. En la terminal de VS Code, en la carpeta del proyecto:

   ```powershell
   powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\aplicar-v0.59.ps1"
   ```

## 2. Crear los webhooks en Discord (5 minutos)

Uno por canal. Para cada uno de los tres (por ejemplo `#resultados`, `#liga` y `#agenda`; pueden
ser el mismo canal si prefieres):

1. En tu servidor de Discord, pasa el ratón por el canal → **rueda dentada (Editar canal)**.
2. **Integraciones → Webhooks → Nuevo webhook**.
3. Nómbralo «PokeArena» y, si quieres, súbele el logo (`public/apple-touch-icon.png` del proyecto).
4. **Copiar URL del webhook**. Empieza por `https://discord.com/api/webhooks/…`.

> ⚠️ Esa URL es una **contraseña**: quien la tenga puede escribir en tu canal. No la pegues en el
> chat ni la subas a Git (`.env.local` ya está fuera de Git).

## 3. Ponerlas en la app

**En local**, añade a tu `.env.local` las que vayas a usar:

```
DISCORD_WEBHOOK_RESULTADOS="https://discord.com/api/webhooks/…"
DISCORD_WEBHOOK_LIGA="https://discord.com/api/webhooks/…"
DISCORD_WEBHOOK_AGENDA="https://discord.com/api/webhooks/…"
```

**En producción**: Vercel → tu proyecto → **Settings → Environment Variables** → las mismas tres,
y **vuelve a desplegar** (las variables nuevas no se aplican hasta el siguiente despliegue).

Opcional: `APP_URL="https://tu-dominio"` si los enlaces de los mensajes deben llevar a otra
dirección que la de producción en Vercel.

## 4. Probarlo

- **Ajustes → Discord**: verás cuáles están puestos. «Mandar pendientes ahora» y «Mandar agenda
  ahora» los envían al momento.
- **Resultados**: cierra un torneo de prueba que tenga algún resultado apuntado. Sale solo.
- **Los lunes**: el cron de cada noche (04:00 UTC, ya lunes en Madrid) manda pendientes y agenda.
  Necesita `CRON_SECRET` en Vercel, como el resto del cron.

## 5. Lo demás

- **Estadísticas**: arriba, «En números»; debajo, los gráficos en orden. El meta online cambia
  con el formato y las fechas de los filtros.
- **Mazos → edita uno**: «Comentarios de la lista». Salen en la ficha, encima de la lista.

Súbelo: el mismo comando con `-SoloSubir` al final.
