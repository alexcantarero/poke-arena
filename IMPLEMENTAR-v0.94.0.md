# IMPLEMENTAR v0.94.0

Requiere aplicar una migración SQL revisada. No hay variables de entorno nuevas.

## Cambios

- Se puede elegir una ruta de título disponible o un título de un logro obtenido.
- Las rutas evolucionan automáticamente según el progreso actual:
  - Liga: 10, 50, 100 y 250 partidas.
  - Circuito: 1, 5, 15 y 30 torneos.
  - Eventos: 1, 5, 10 y 20 Top Cuts.
  - Medallas: 1, 3, 5 y 8 medallas; una ruta dorada cuenta medallas de oro.
  - Secretos: 3, 7, 10 y todos los logros.
- La selección del título se valida en el servidor según el progreso y los logros de la cuenta.
- El pie de la barra lateral muestra el rango de Ball y su progreso; el nombre enlaza al perfil.
- El perfil muestra para cada logro obtenido su prevalencia entre cuentas activas con partidas o
  resultados de torneo; no muestra datos identificativos de otras personas.
- La tarjeta de CP enlaza al desglose de la temporada.
- La Ball de uso muestra el progreso porcentual y una barra temática; los umbrales no cambian.
- El selector de mazo conserva el arreglo de Safari táctil preparado previamente en el árbol de
  trabajo.

## Migración

Revisar y aplicar manualmente en la rama **dev** de Neon:

```sql
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS profile_title text NOT NULL DEFAULT '';
```

El SQL está en `drizzle/0028_v0_94_0.sql`. No se ejecutó desde este cambio. No aplicar en
producción sin revisión y autorización explícita.

## Comprobación manual

1. Abrir el perfil y pulsar la tarjeta CP; debe desplazarse al desglose.
2. Comprobar rango actual, porcentaje de progreso y puntos restantes de la Ball.
3. En «Editar perfil», comprobar que aparecen solo las rutas alcanzadas y los títulos de logros
   desbloqueados; escoger una y guardarla.
4. Aumentar el progreso de una ruta y comprobar que el título elegido evoluciona al siguiente
   escalón. Intentar enviar una ruta o logro no desbloqueado y comprobar que el servidor lo rechaza.
5. Pulsar el nombre del panel inferior izquierdo y comprobar que abre el perfil propio; revisar
   rango y progreso de Ball.
6. Revisar porcentajes y categorías de rareza en perfiles con y sin logros, en ES/EN.

## Deshacer

Revertir el commit de esta versión. La columna puede permanecer sin uso; no es necesario borrar
datos. Si se decide eliminarla, revisar antes el SQL y el valor guardado por los jugadores.
