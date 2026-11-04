# IMPLEMENTAR v0.100.0

Compactación del progreso de Poké Ball en la ficha del perfil. Sin cambios de base de datos ni
variables de entorno.

## Cambios

- Se sustituye la barra de progreso por un porcentaje discreto debajo del icono de la Poké Ball.
- Se mantiene el nivel actual y la cantidad de puntos que faltan para subir.
- En el nivel máximo se muestra el 100 % debajo del icono y el mensaje de nivel máximo junto al nombre.

## Comprobar

```bash
npm run verificar
npm run build
```

En una ficha de perfil, comprueba el progreso con un nivel intermedio y con el nivel máximo.

## Deshacer

Revertir los cambios de la v0.100.0. No hay migraciones ni cambios de datos.
