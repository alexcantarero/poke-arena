# IMPLEMENTAR v0.105.0

Actualizar la escala cromática del porcentaje de victorias para eliminar el amarillo y mantener el
rojo como nivel más bajo. No hay cambios de base de datos ni nuevas variables de entorno.

## Cambios

- La escala va de rojo en los porcentajes bajos a violeta, azul, turquesa y verde en los altos,
  evitando tonos amarillos.
- Los números y las barras de %V usan la misma función en las vistas de ranking general, Todo y
  torneos.
- Se conserva la adaptación de luminosidad existente para los temas claro y oscuro; los valores
  nulos o no válidos siguen en color neutro.

## Comprobar

```bash
npm run verificar
npm run build
```

Revisar las columnas de porcentaje en las vistas de ranking general, Todo y torneos, en tema claro
y oscuro. Confirmar que porcentajes bajos son rojos, los medios violeta/azul y los altos
turquesa/verdes, sin amarillo y con barras a juego.

## Deshacer

Revertir los cambios de la v0.105.0. No hay migraciones ni cambios de datos.
