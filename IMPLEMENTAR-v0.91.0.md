# IMPLEMENTAR v0.91.0

Sin migración de base de datos ni variables de entorno nuevas.

## Cambios

- La sincronización de series online informa con un aviso cuando Limitless responde HTTP 429,
  devuelve otro error o no se puede conectar. En esos casos no se modifica ni se vacía el
  calendario; espera antes de reintentar si Limitless limita las consultas.
- El tutorial del perfil explica sus métricas, filtros, torneos, CP y logros.
- `/perfil/editar` tiene un tutorial que explica los campos y destaca que el importador de torneos
  online debe ejecutarlo un organizador desde Ajustes después de registrar el usuario exacto de
  Limitless.

## Comprobación manual

1. Abrir el perfil propio y recorrer la guía; comprobar también las pestañas de ámbito.
2. Abrir «Editar perfil» y revisar los pasos del nombre de usuario de Limitless, avatar y guardado.
3. En Ajustes, probar «Buscar ahora» en torneos online previstos. Si Limitless devuelve 429, debe
   aparecer el aviso de espera y conservarse el calendario; la app no puede eliminar el límite
   impuesto por ese servicio.

## Deshacer

Revertir el commit de esta versión. No hay cambios de esquema que revertir.
