# IMPLEMENTAR v0.137.0

Sobre la **v0.136.0**. **Con migración (0038).**

## 1. Migración

Neon → SQL Editor, **primero `dev`** y luego `production`: `drizzle/0038_v0_137_0.sql`
(idempotente). En local: `npm run db:migrar`.

## 2. Aplicar

Descomprime `arena-v0.137.0.zip` en la raíz del repo y doble clic en **`aplicar-v0.137.bat`**.
Si algo falla, mándame `aplicar-v0.137.log`.

## 3. Probar

1. **Herramientas → Premios → Simulador**: elige un mazo con lista de 60, «Repartir». Ves la mano,
   6 premios boca abajo y el mazo. Elige 6 cartas con + y −, «Comprobar»: se destapan los premios
   y marca los aciertos. «Real» enseña el mazo sin ordenar.
2. **Dificultad**: crea un mazo eligiendo «Difícil»; en la biblioteca sale la etiqueta naranja.
   En «Comparar versiones», vota con otra cuenta: la etiqueta cambia a la media. Filtra la
   biblioteca por un nivel.
3. **Sesiones del Live**: en la ficha de un mazo tuyo, apunta 10-5 con fechas de esta semana. Sale
   con tu rango del ladder y su peso, y el total del mazo sube 10-5. En Estadísticas → PTCG Live
   el % de ese arquetipo es el ponderado.

## Deshacer

`git revert` del commit. Las dos tablas nuevas pueden quedarse.
