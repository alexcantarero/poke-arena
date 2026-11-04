# IMPLEMENTAR v0.101.0

Reubicar y destacar el progreso de Poké Ball en el perfil. Sin cambios de base de datos ni
variables de entorno.

## Cambios

- Se retira el progreso y su porcentaje de la tarjeta lateral; se conserva el nivel actual.
- En el perfil se muestra una barra de progreso dorada, el porcentaje compacto y los puntos
  restantes para el siguiente nivel.
- La barra representa el 100 % al alcanzar el nivel máximo.

## Comprobar

```bash
npm run verificar
npm run build
```

En la tarjeta lateral confirma que solo aparece el rango actual. En un perfil comprueba la barra,
el porcentaje, los puntos restantes y el nivel máximo.

## Deshacer

Revertir los cambios de la v0.101.0. No hay migraciones ni cambios de datos.
