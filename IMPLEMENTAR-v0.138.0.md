# IMPLEMENTAR v0.138.0

Sobre la **v0.137.0** (y su migración 0038). **Con migración (0039).**

## 1. Migración

Neon → SQL Editor, **primero `dev`** y luego `production`: `drizzle/0039_v0_138_0.sql`
(idempotente). En local: `npm run db:migrar`.

## 2. Aplicar

Descomprime `arena-v0.138.0.zip` en la raíz del repo y doble clic en **`aplicar-v0.138.bat`**.
Si algo falla, mándame `aplicar-v0.138.log`.

## 3. Probar

1. **Herramientas → «El modelo de cruces, puesto a prueba»**: Brier, log-loss y acierto con
   vuestras partidas, frente a decir siempre 50 % (Brier 0,25). Mira si dice «mejor que tirar
   una moneda» y qué τ y prior salen arriba en la rejilla. **Mándame esos números**: con ellos
   decidimos si se enchufa al recomendador y con qué parámetros.
2. Cambia la ventana (30/60/90 días): los números cambian.
3. Al día siguiente del cron, la tarjeta «Registrado» empieza a tener predicciones.
4. **Herramientas → Recomendador** sigue funcionando; el acierto que enseña puede bajar: es la
   fuga que se ha quitado, no que el modelo vaya peor.

## Deshacer

`git revert` del commit. La tabla `predicciones` puede quedarse.
