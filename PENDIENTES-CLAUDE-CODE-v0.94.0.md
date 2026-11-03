# Pendientes de revisión — v0.94.0

## Estado de esta entrega

- `npm run verificar`: correcto; 665 pruebas, TypeScript y comprobaciones de codificación.
- `npm run build`: correcto.
- Smoke test local: `/api/version` y `/entrar` respondieron HTTP 200.
- La migración `drizzle/0028_v0_94_0.sql` fue aplicada manualmente en `dev` y producción,
  según confirmó el responsable. No se ejecutó ninguna operación de base de datos desde esta sesión.

## Pendientes recomendados

1. **Completar traducciones existentes.** El verificador informa de alrededor de 25 textos sin
   traducir repartidos entre 11 ficheros. Revisar y añadir las claves ES/EN donde corresponda:
   - `src/components/ui.tsx` (11)
   - `src/app/(app)/torneos/page.tsx` (3)
   - `src/app/(app)/ajustes/uso/page.tsx` (2)
   - `src/components/charts/SeguimientoJugadores.tsx` (2)
   - `src/app/(app)/ajustes/page.tsx` (1)
   - `src/app/(app)/calendario/page.tsx` (1)
   - `src/app/(app)/ranking/page.tsx` (1)
   - `src/app/(app)/torneos/[id]/resumen/route.tsx` (1)
   - `src/app/(app)/reglas/page.tsx` (1)
   - `src/components/Instalacion.tsx` (1)
   - `src/components/statistics/lazy.tsx` (1)

2. **Prueba manual autenticada de perfil.** El smoke test no inició sesión ni recorrió páginas que
   requieren datos. Comprobar en `dev` que el pie de la barra enlaza al perfil, que muestra el
   rango y progreso correctos, y que se pueden seleccionar títulos desbloqueados. Verificar también
   cómo evoluciona un título al alcanzar el siguiente hito y que el servidor rechaza IDs no elegibles.

3. **Regresión en Safari de iPhone.** Repetir el registro de partida dentro de un torneo con el
   selector de mazos en un dispositivo real. La prueba automatizada cubre el cierre de foco sin
   `relatedTarget`, pero no sustituye la comprobación táctil de extremo a extremo.

## Nota de entorno

El puerto 3000 ya estaba ocupado por otro proceso de Next.js; la comprobación se hizo en el 3001.
No se detuvo el proceso que ocupaba el 3000. El servidor local iniciado para la prueba ya se cerró.
