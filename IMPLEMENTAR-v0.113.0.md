# IMPLEMENTAR v0.113.0

Gestión del titular, retos y defensas del Cinturón. No se añaden dependencias ni variables de
entorno nuevas.

## Reglas

- Puede retar cualquier jugador activo que esté en el top 5 de la clasificación principal o tenga
  Elo ≥1100.
- El poseedor tiene 10 días para aceptar o rechazar. Rechazar explícitamente conserva el título;
  no responder transfiere el Cinturón al retador.
- Tras aceptar, los participantes juegan un Bo3. Uno propone quién ganó y el otro debe confirmarlo.
  Si discrepa, el resultado se borra y queda pendiente de volver a proponerlo. No se introduce un
  plazo automático para jugar después de aceptar.
- Quien pierde espera 30 días antes de retar de nuevo al mismo poseedor.
- Seis semanas sin una defensa completada dejan el Cinturón vacante. Un organizador puede abrir un
  nuevo suizo Bo3; la inscripción queda abierta hasta que el organizador lo inicie.

## Antes de probar en dev

1. Revisa `drizzle/0031_v0_112_0.sql` y aplícalo manualmente en la rama **dev** de Neon si aún no
   está aplicado.
2. Revisa y aplica `drizzle/0032_v0_113_0.sql`, también solo en **dev**.
3. Publica el código en `development`. No ejecutar `db:push` ni aplicar cambios a producción.

La migración 0032 crea el estado e historial del Cinturón y marca como evento actual el torneo
inaugural si ya existe. Si la inscripción del torneo inaugural sigue abierta, la primera inscripción
tras la migración también establece ese evento como actual.

## Cron y Discord

El cron diario existente gestiona los vencimientos y la vacante. Sigue ejecutándose a las 07:00 UTC
(08:00 en Madrid el 20 de noviembre); al depender de una ejecución diaria, los cambios automáticos
pueden reflejarse con hasta un día de retraso. Los avisos del Cinturón usan el webhook opcional
`DISCORD_WEBHOOK_RESULTADOS`.

## Verificación

- `npm run verificar`
- `npm run build`
