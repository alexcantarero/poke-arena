# IMPLEMENTAR v0.102.0

Unificar las pestañas internas, mejorar la tarjeta de perfil lateral y ampliar la progresión de
Poké Balls. No hay cambios de base de datos ni nuevas variables de entorno.

## Cambios

- Las pestañas de metagame, estadísticas, mazos, ámbitos y fases de torneo comparten la plantilla
  visual `.pestanas` / `.pestana`. Los filtros y los selectores de gráficos/calendario no cambian.
- En el pie lateral, el nombre, el papel, el título y el rango tienen más espacio; el sprite de la
  Ball sube a 24 px.
- La progresión por actividad incluye las Balls estándar, las Apricorn, las de evento y las
  variantes especiales de Hisui, Paldea y Luminalia, ordenadas aproximadamente por rareza.
  Los puntos de uso existentes (partida 1, torneo 3 y logro 5) se conservan.

## Comprobar

```bash
npm run verificar
npm run build
```

En escritorio comprueba que las barras de Estadísticas, Top Decks/Mazos, ámbitos y fases de torneo
se ven coherentes y se pueden desplazar en móvil. Comprueba también la tarjeta del pie lateral y
los rangos inicial, intermedio y máximo.

## Deshacer

Revertir los cambios de la v0.102.0. No hay migraciones ni cambios de datos.
