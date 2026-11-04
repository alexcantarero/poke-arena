# IMPLEMENTAR v0.104.0

Hacer más legibles las gráficas del ranking y reducir la altura inicial de las listas largas.
No hay cambios de base de datos ni nuevas variables de entorno.

## Cambios

- Camino al Mundial y la tabla del Ladder muestran las primeras cinco personas. El control
  «Ver N más» expande el resto sin perder puestos, favoritos ni la línea de corte de invitaciones.
- Las gráficas de Elo y Ladder colocan primero las personas seleccionadas en sus controles, resaltan
  con el color de la serie las selecciones activas e indican cuántas están visibles.
- Con más de tres series en la gráfica, se ocultan los puntos estáticos para reducir el ruido; al
  seleccionar hasta tres vuelven a mostrarse. Se mantienen los tooltips, periodos y filtros.

## Comprobar

```bash
npm run verificar
npm run build
```

En `/ranking`, comprueba que las listas muestran cinco personas antes de expandirlas, que «Ver N
más» revela el resto y que los números de puesto y el corte Top N se mantienen. En ambos gráficos,
comprueba la prioridad de las selecciones, el contador, los botones «Todos/Ninguno» y la lectura de
las líneas con varios jugadores.

## Deshacer

Revertir los cambios de la v0.104.0. No hay migraciones ni cambios de datos.
