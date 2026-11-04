# IMPLEMENTAR v0.98.0

Mejora del filtro de ciudad del calendario. Sin cambios de base de datos ni variables de entorno.

## Cambios

- El filtro permite escribir un término libre o elegir una sugerencia registrada.
- La coincidencia es parcial y no distingue mayúsculas ni acentos: «Barcelona» también incluye
  «Barcelona - La Garriga».
- Las ubicaciones con dirección, código postal y país se agrupan por el nombre de la ciudad.
- El texto original de las ubicaciones se conserva al mostrar los eventos.

## Comprobar

```bash
npm run verificar
npm run build
```

En Calendario, escribe «Barcelona» y pulsa «Aplicar» sin elegir una sugerencia. Comprueba que
aparecen también las ubicaciones «Barcelona - …» y las direcciones cuyo nombre de ciudad contiene
Barcelona.

## Deshacer

Revertir los cambios de la v0.98.0. No hay migraciones ni cambios de datos.
