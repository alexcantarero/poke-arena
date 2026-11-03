# IMPLEMENTAR v0.92.0

No requiere migración ni variables de entorno nuevas.

## Cambios

- El calendario y la agenda permiten combinar el filtro de tipos con una ciudad.
- El selector solo contiene ubicaciones ya registradas en eventos presenciales y ciudades
  asociadas a torneos; no inventa opciones ni muestra la etiqueta genérica de los torneos online.
- Los filtros permanecen en la URL al cambiar mes o vista, y «Quitar filtros» elimina ambos.
- En eventos, el campo de ubicación es texto libre y se muestra tal como está guardado.

## Comprobación manual

1. Abrir Calendario y comprobar que el selector solo enumera ubicaciones disponibles.
2. Elegir una ciudad y confirmar que solo aparecen sus eventos/torneos tanto en Calendario como
   en Agenda.
3. Combinar ciudad y tipo; navegar a otro mes y cambiar de vista. La selección debe persistir.
4. Usar «Quitar filtros» y comprobar que se muestran de nuevo todas las ciudades y tipos.

## Deshacer

Revertir el commit de esta versión. No hay cambios de esquema que revertir.
