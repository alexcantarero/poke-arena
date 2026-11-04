# IMPLEMENTAR v0.97.0

Mejora visual de la tarjeta de la barra lateral. Sin cambios de base de datos ni variables de
entorno.

## Cambios

- El porcentaje de progreso hacia la siguiente Poké Ball aparece centrado en la barra.
- Se retira la línea con los puntos restantes para reducir la altura de la tarjeta.
- Se retira de la barra lateral la versión y los datos del despliegue; la versión sigue visible
  en Ajustes.

## Comprobar

```bash
npm run verificar
npm run build
```

En escritorio, comprueba la tarjeta de perfil en la barra lateral: el porcentaje debe verse en la
barra y no debe aparecer la línea de puntos restantes ni la versión. En Ajustes, la versión debe
seguir disponible. Si vas a probar con `npm run dev`, asegúrate antes de que el entorno local usa
la rama `dev` de Neon.

## Deshacer

Revertir los cambios de la v0.97.0. No hay migraciones ni cambios de datos.
