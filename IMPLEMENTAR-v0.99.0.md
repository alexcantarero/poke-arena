# IMPLEMENTAR v0.99.0

Redistribución de la tarjeta del perfil y del progreso de Poké Ball en la barra lateral. Sin cambios
de base de datos ni variables de entorno.

## Cambios

- Nombre y rango de Poké Ball en la misma línea.
- Papel y título de perfil seleccionado debajo del nombre.
- Porcentaje fuera de la barra de progreso para mejorar su lectura.
- El título se calcula con consultas acotadas al jugador, sin cargar `loadSnapshot()` en todas las
  páginas.

## Comprobar

```bash
npm run verificar
npm run build
```

En escritorio, comprueba la tarjeta expandida y plegada. Verifica que el título coincide con el
mostrado en el perfil y que el porcentaje se lee junto a la barra.

## Deshacer

Revertir los cambios de la v0.99.0. No hay migraciones ni cambios de datos.
