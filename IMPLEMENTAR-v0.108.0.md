# IMPLEMENTAR v0.108.0

Acumulativo sobre la **v0.105.0** (lleva la v0.106, la v0.107 y la v0.108). Si ya subiste alguna
de ellas, aplica este zip encima igualmente.

## 1. Migración (solo si no aplicaste la de la v0.106)

Neon → SQL Editor, primero `dev` y luego `production`: `drizzle/0030_v0_106_0.sql` (tabla
`asistencias`). El SQL también está en `IMPLEMENTAR-v0.106.0.md`.

## 2. Copiar y comprobar

Descomprime `arena-v0.108.0-cambios.zip` en la raíz del repo, sobrescribiendo. Sin dependencias
nuevas ni ficheros que borrar.

```bash
npm run verificar   # 708 tests + tsc + codificación + i18n (0 textos pendientes)
npm run build
npm run dev
```

## 3. Probar

1. **Modo directo**: abre un torneo en curso → «Modo directo». Apunta una ronda: debe volver al
   modo directo con el récord actualizado.
2. **Inicio → En directo**: con un torneo abierto con fecha de hoy y alguna ronda apuntada, sale
   la clasificación del grupo. Si no hay ninguno, el bloque no aparece.
3. **Ranking → Enfrentamientos directos**: toca una celda → debajo, las partidas de ese cruce.
   Lo mismo en **Estadísticas → Matriz de emparejamientos**. «✕» lo cierra.
4. **Evolución del Elo**: rombos de colores en las rondas de torneo; «Marcar torneos» los quita.
5. **Calendario → Agenda**: con alguien más marcado «Iré», sale «Van N».
6. **Estadísticas → Seguimiento de jugadores**: colores distintos y nombre al final de cada línea.
7. **Idioma EN**: los textos de la tarjeta de partida, el récord y las gráficas salen en inglés.
8. **Rendimiento**: en Vercel → Logs, busca `[rendimiento]`. Si no sale nada, el snapshot carga
   en menos de medio segundo. Si sale, mándamelo: dice dónde se va el tiempo.
