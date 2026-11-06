# IMPLEMENTAR v0.112.0

Torneo suizo inaugural para disputar el primer Cinturón. Sin dependencias ni variables de entorno
nuevas.

## Funcionalidad

- Los jugadores activos pueden apuntarse hasta el **20 de noviembre de 2026 a las 08:00,
  Europe/Madrid**.
- El cron diario inicia la primera ronda Bo3 a esa hora y crea los emparejamientos suizos. Si el
  cron no se ejecuta, un organizador puede iniciar el suizo desde la página «Torneo del Cinturón».
- Las rondas siguientes solo se crean después de completar todos los resultados de la ronda actual.
  Los descansos de grupos impares puntúan para la clasificación del torneo y no alteran el Elo.
- Al completar las rondas, un organizador cierra el torneo; el primer puesto queda proclamado
  ganador del torneo inaugural. La gestión de retos y titularidad del cinturón corresponde a una
  fase posterior.

## Antes de probar en dev

1. Revisa `drizzle/0031_v0_112_0.sql`.
2. Aplica manualmente el SQL **solo a la rama dev de Neon**. No ejecutar contra producción ni usar
   `db:push`.
3. Publica el código en `development`; registra inscripciones en `/cinturon`.

No se ha aplicado el SQL ni se ha desplegado a producción.

## Cron

El cron existente se adelanta a las **07:00 UTC** para iniciar el torneo a las 08:00 de Madrid el
20 de noviembre. Las demás tareas diarias (limpieza, sincronización, avisos y métricas) también se
ejecutarán a esa nueva hora.

## Verificación

- `npm run verificar`
- `npm run build`
